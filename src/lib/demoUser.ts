// 本番では LIFF SDK からLINEプロフィールを取得するが、
// LIFF未設定時はログイン済みのダミーユーザーを使う。
export const DEMO_USER = {
  userId: 'demo-user-001',
  displayName: '山田 花子',
  pictureUrl: null as string | null,
};
