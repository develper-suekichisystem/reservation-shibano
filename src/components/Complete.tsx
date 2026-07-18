// 大会運営者の個人LINE友だち追加URL（アプリ共通・環境変数で設定）
const ORGANIZER_LINE_URL = import.meta.env.VITE_ORGANIZER_LINE_URL as string | undefined;

interface Props {
  entryId: string;
  onRestart: () => void;
}

export function Complete({ entryId, onRestart }: Props) {
  const organizerLineUrl = ORGANIZER_LINE_URL;
  return (
    <div className="complete">
      <div className="complete-icon">✓</div>
      <h2 className="complete-title">エントリーが完了しました</h2>
      <p className="complete-message">
        エントリーありがとうございます。<br />
        LINEに申込控えをお送りしましたのでご確認ください。
      </p>
      <p className="complete-id">受付番号: {entryId.slice(0, 8).toUpperCase()}</p>

      {organizerLineUrl && (
        <div className="organizer-line">
          <p className="organizer-line-title">大会運営者のLINEを追加してください</p>
          <p className="organizer-line-message">
            大会の連絡・当日のご案内は運営者の個人LINEで行います。<br />
            下のボタンから友だち追加をお願いします。
          </p>
          <a
            className="btn-line-add"
            href={organizerLineUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            運営者LINEを追加する
          </a>
        </div>
      )}

      <p className="complete-note">
        キャンセルの場合はLINEよりご連絡ください。
      </p>
      <button className="btn-back" onClick={onRestart}>最初の画面に戻る</button>
    </div>
  );
}
