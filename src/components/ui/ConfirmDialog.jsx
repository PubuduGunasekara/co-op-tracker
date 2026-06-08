import Modal from './Modal.jsx'

// Confirmation dialog for destructive actions (delete).
export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-danger"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </Modal>
  )
}
