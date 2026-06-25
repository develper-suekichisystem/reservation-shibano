interface Props {
  variant?: 'full' | 'overlay';
}

export function LoadingSpinner({ variant = 'full' }: Props) {
  const isFull = variant === 'full';

  return (
    <div className={isFull ? 'spinner-overlay' : 'spinner-overlay-api'}>
      <div className="spinner-content">
        <div className="spinner-ring" />
        <p className="spinner-text">{isFull ? '読み込み中...' : '通信中...'}</p>
      </div>
    </div>
  );
}
