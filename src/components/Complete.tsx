interface Props {
  entryId: string;
  onRestart: () => void;
}

export function Complete({ entryId, onRestart }: Props) {
  return (
    <div className="complete">
      <div className="complete-icon">✓</div>
      <h2 className="complete-title">エントリーが完了しました</h2>
      <p className="complete-message">
        エントリーありがとうございます。<br />
        LINEに申込控えをお送りしましたのでご確認ください。
      </p>
      <p className="complete-id">受付番号: {entryId.slice(0, 8).toUpperCase()}</p>
      <p className="complete-note">
        キャンセルの場合はLINEよりご連絡ください。
      </p>
      <button className="btn-back" onClick={onRestart}>最初の画面に戻る</button>
    </div>
  );
}
