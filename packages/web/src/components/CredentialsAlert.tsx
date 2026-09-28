interface Props {
  message: string;
  onDismiss: () => void;
}

export function CredentialsAlert({ message, onDismiss }: Props) {
  return (
    <div className="modal-overlay" role="alertdialog" aria-modal="true">
      <div className="modal">
        <h2>⚠ Security reminder</h2>
        <p>{message}</p>
        <button type="button" onClick={onDismiss}>
          I understand, dismiss
        </button>
      </div>
    </div>
  );
}
