// ---------------------------------------------------------------------------
// Best-effort "fill from a job link" support.
//
// This app is static/offline-first — there is no backend to fetch pages on
// the user's behalf, so everything here runs in the browser. That means:
//   - Greenhouse and Lever expose public JSON APIs with permissive CORS, so
//     links to those ATSs resolve reliably.
//   - A generic fetch() of any other job page is attempted too, but most
//     sites (LinkedIn, Workday, most company career sites) do not send
//     CORS headers and the request will be blocked by the browser. This is
//     indistinguishable from a network error, so we just report it as
//     "couldn't fetch" and let the caller fall back to pasted text.
//   - As a fallback, the user can paste either the plain job text OR the
//     page's HTML source (e.g. via "View Page Source") — pasting bypasses
//     CORS entirely since the browser already loaded the page. We detect
//     which one was pasted and parse accordingly.
// Nothing here ever auto-submits the form; callers always leave the result
// editable.
// ---------------------------------------------------------------------------

export class JobFetchError extends Error {
  constructor(message, { corsLikely = false } = {}) {
    super(message)
    this.name = 'JobFetchError'
    this.corsLikely = corsLikely
  }
}

function titleCaseSlug(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Some ATS APIs (e.g. Greenhouse) return their HTML content field
// HTML-entity-escaped rather than as raw markup, so `<div>` arrives as the
// literal text "&lt;div&gt;". Detect that and unescape once before parsing,
// otherwise the tags themselves end up in the extracted text.
function decodeEntities(str) {
  return new DOMParser().parseFromString(str, 'text/html').documentElement.textContent
}

function stripHtml(html) {
  if (!html) return ''
  const source = /&lt;\/?\w+/.test(html) ? decodeEntities(html) : html
  const doc = new DOMParser().parseFromString(source, 'text/html')
  return (doc.body?.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}

// Recursively search a parsed JSON-LD value for a node whose @type includes
// "JobPosting" (schema.org graphs nest these under @graph, arrays, etc).
function findJobPostingNode(node) {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPostingNode(item)
      if (found) return found
    }
    return null
  }
  const type = node['@type']
  const types = Array.isArray(type) ? type : [type]
  if (types.some((t) => typeof t === 'string' && t.toLowerCase() === 'jobposting')) {
    return node
  }
  if (node['@graph']) return findJobPostingNode(node['@graph'])
  return null
}

function orgName(hiringOrganization) {
  if (!hiringOrganization) return ''
  if (typeof hiringOrganization === 'string') return hiringOrganization
  return hiringOrganization.name || ''
}

/** Parse an HTML document (fetched or pasted) for job details. */
export function parseJobPostingHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // 1) schema.org JobPosting JSON-LD — most reliable when present.
  const ldScripts = doc.querySelectorAll('script[type="application/ld+json"]')
  for (const script of ldScripts) {
    try {
      const parsed = JSON.parse(script.textContent)
      const job = findJobPostingNode(parsed)
      if (job) {
        return {
          company: orgName(job.hiringOrganization),
          role: job.title || '',
          jobDescription: stripHtml(job.description || ''),
        }
      }
    } catch (e) {
      // Malformed JSON-LD on the page; keep looking at other scripts/tags.
    }
  }

  // 2) OpenGraph / meta fallback.
  const metaContent = (name) =>
    doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content || ''
  const ogTitle = metaContent('og:title')
  const ogSite = metaContent('og:site_name')
  const pageTitle = doc.querySelector('title')?.textContent || ''

  let role = ogTitle || pageTitle
  let company = ogSite

  // Titles are often "Role at Company" or "Role - Company" or "Company - Role".
  const sep = role.match(/^(.*?)\s+(?:at|@)\s+(.*)$/i) || role.match(/^(.*?)\s+[-|–]\s+(.*)$/)
  if (sep && !company) {
    role = sep[1].trim()
    company = sep[2].trim()
  }

  return { company: company.trim(), role: role.trim(), jobDescription: '' }
}

/** Fetch a Greenhouse job posting via its public board API. */
async function fetchGreenhouse(match) {
  const [, board, jobId] = match
  const [jobRes, boardRes] = await Promise.all([
    fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${jobId}?content=true`),
    fetch(`https://boards-api.greenhouse.io/v1/boards/${board}`).catch(() => null),
  ])
  if (!jobRes.ok) throw new JobFetchError('Greenhouse job not found (it may have closed).')
  const job = await jobRes.json()
  const boardInfo = boardRes && boardRes.ok ? await boardRes.json() : null
  return {
    company: boardInfo?.name || titleCaseSlug(board),
    role: job.title || '',
    jobDescription: stripHtml(job.content || ''),
  }
}

/** Fetch a Lever job posting via its public postings API. */
async function fetchLever(match) {
  const [, company, postingId] = match
  const res = await fetch(`https://api.lever.co/v0/postings/${company}/${postingId}?mode=json`)
  if (!res.ok) throw new JobFetchError('Lever posting not found (it may have closed).')
  const job = await res.json()
  const description = [job.descriptionPlain, ...(job.lists || []).map((l) => `${l.text}\n${stripHtml(l.content)}`)]
    .filter(Boolean)
    .join('\n\n')
  return {
    company: titleCaseSlug(company),
    role: job.text || '',
    jobDescription: description,
  }
}

const GREENHOUSE_RE = /(?:job-boards|boards)\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/
const LEVER_RE = /jobs\.lever\.co\/([^/]+)\/([^/?#]+)/

/**
 * Try to fetch job details for a pasted URL. Resolves with whatever fields
 * it could find (fields may be blank); throws JobFetchError if the fetch
 * itself failed (network/CORS/404), signaling the caller to fall back to
 * asking the user to paste the posting text instead.
 */
export async function fetchJobDetails(rawUrl) {
  const url = rawUrl.trim()
  if (!url) throw new JobFetchError('Paste a job link first.')

  const gh = url.match(GREENHOUSE_RE)
  if (gh) return { ...(await fetchGreenhouse(gh)), portalLink: url }

  const lever = url.match(LEVER_RE)
  if (lever) return { ...(await fetchLever(lever)), portalLink: url }

  try {
    const res = await fetch(url)
    if (!res.ok) throw new JobFetchError(`Site responded with ${res.status}.`)
    const html = await res.text()
    return { ...parseJobPostingHtml(html), portalLink: url }
  } catch (e) {
    if (e instanceof JobFetchError) throw e
    throw new JobFetchError(
      "Couldn't fetch that page directly — most job sites block cross-site requests from the browser.",
      { corsLikely: true }
    )
  }
}

/**
 * Best-effort extraction from pasted content. Accepts either the page's
 * HTML source (pasted via "View Page Source" / "Copy as HTML") or plain
 * job-description text copied straight off the page.
 */
export function extractFromPastedContent(text) {
  const trimmed = text.trim()
  if (!trimmed) return { company: '', role: '', jobDescription: '' }

  const looksLikeHtml = /<html[\s>]|<script[\s>]|<!doctype html/i.test(trimmed)
  if (looksLikeHtml) {
    const result = parseJobPostingHtml(trimmed)
    if (result.company || result.role || result.jobDescription) return result
  }

  // Plain-text heuristics: title is usually the first non-empty line; look
  // for "Role at Company" / "Company - Role" patterns within the first few
  // lines. Keep the whole text as the job description regardless.
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)
  let company = ''
  let role = ''
  for (const line of lines.slice(0, 5)) {
    const atMatch = line.match(/^(.*?)\s+(?:at|@)\s+([A-Z][\w&.,' -]{1,60})$/)
    if (atMatch) {
      role = atMatch[1].trim()
      company = atMatch[2].trim()
      break
    }
  }
  if (!role && lines[0]) role = lines[0].slice(0, 120)

  return { company, role, jobDescription: trimmed }
}
