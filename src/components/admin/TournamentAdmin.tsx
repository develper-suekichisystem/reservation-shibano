import { useEffect, useState } from 'react';
import {
  fetchAllTournaments, createTournament, updateTournament,
  setTournamentActive, deleteTournament,
} from '../../lib/db';
import {
  formatEventDate, formatDateTime, entryEndAt,
  toDateTimeLocalValue, fromDateTimeLocalValue,
} from '../../lib/format';
import type { TournamentWithCount } from '../../types';

const CURRENT_YEAR = String(new Date().getFullYear());

const EMPTY_FORM = {
  name: '',
  fiscal_year: CURRENT_YEAR,
  event_date: '',
  venue: '',
  capacity: '16',
  description: '',
  entry_start_at: '',      // datetime-local 値。空 = 即時エントリー可能
  entry_end_at: '',        // datetime-local 値。空 = 開催日の1週間前まで
  entry_limit_enabled: true,
  is_active: true,
};

export function TournamentAdmin() {
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TournamentWithCount | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchList(); }, []);

  async function fetchList() {
    setLoading(true);
    setTournaments(await fetchAllTournaments());
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(t: TournamentWithCount) {
    setEditing(t);
    setForm({
      name: t.name,
      fiscal_year: t.fiscal_year,
      event_date: t.event_date,
      venue: t.venue,
      capacity: String(t.capacity),
      description: t.description ?? '',
      entry_start_at: toDateTimeLocalValue(t.entry_start_at),
      entry_end_at: toDateTimeLocalValue(t.entry_end_at),
      entry_limit_enabled: t.entry_limit_enabled,
      is_active: t.is_active,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.event_date || !form.venue.trim() || !form.fiscal_year.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      fiscal_year: form.fiscal_year.trim(),
      event_date: form.event_date,
      venue: form.venue.trim(),
      capacity: parseInt(form.capacity) || 16,
      description: form.description.trim() || null,
      entry_start_at: fromDateTimeLocalValue(form.entry_start_at),
      entry_end_at: fromDateTimeLocalValue(form.entry_end_at),
      entry_limit_enabled: form.entry_limit_enabled,
      is_active: form.is_active,
    };
    if (editing) {
      await updateTournament(editing.id, payload);
    } else {
      await createTournament(payload);
    }
    setSaving(false);
    closeForm();
    fetchList();
  }

  async function toggleActive(t: TournamentWithCount) {
    await setTournamentActive(t.id, !t.is_active);
    fetchList();
  }

  async function handleDelete(t: TournamentWithCount) {
    if (!confirm(`「${t.name}」を削除しますか？\n（エントリーも一緒に削除されます）`)) return;
    await deleteTournament(t.id);
    fetchList();
  }

  // 年度ごとにグループ化
  const grouped = new Map<string, TournamentWithCount[]>();
  for (const t of tournaments) {
    if (!grouped.has(t.fiscal_year)) grouped.set(t.fiscal_year, []);
    grouped.get(t.fiscal_year)!.push(t);
  }
  const years = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

  if (loading) return <div className="loading">読み込み中...</div>;

  return (
    <div className="menu-admin">
      <div className="menu-admin-header">
        <h2 className="admin-section-title">大会管理</h2>
        <button className="btn-add" onClick={openNew}>＋ 追加</button>
      </div>

      {years.map(year => (
        <div key={year} className="admin-year-group">
          <h3 className="admin-year-heading">{year}年度</h3>
          <div className="menu-admin-list">
            {grouped.get(year)!.map(t => (
              <div key={t.id} className={`menu-admin-card${t.is_active ? '' : ' inactive'}`}>
                <div className="menu-admin-info">
                  <div className="menu-admin-name">{t.name}</div>
                  <div className="menu-admin-duration">
                    {formatEventDate(t.event_date)}　{t.venue}
                  </div>
                  <div className="menu-admin-duration">
                    受付 {t.entry_start_at ? formatDateTime(t.entry_start_at) : '即時'}
                    　〜 {formatDateTime(entryEndAt(t).toISOString())}
                    {t.entry_end_at ? '' : '（開催1週間前）'}
                  </div>
                  <div className="menu-admin-duration">
                    エントリー制限：{t.entry_limit_enabled ? 'あり（年度内1エントリー）' : 'なし'}
                  </div>
                  <div className={`menu-admin-price${t.confirmed_count >= t.capacity ? ' full' : ''}`}>
                    申込 {t.confirmed_count}/{t.capacity}チーム
                    {t.confirmed_count >= t.capacity && '（満員）'}
                  </div>
                  {t.description && (
                    <div className="menu-admin-desc">{t.description}</div>
                  )}
                </div>
                <div className="menu-admin-actions">
                  <button
                    className={`btn-toggle${t.is_active ? ' active' : ''}`}
                    onClick={() => toggleActive(t)}
                  >
                    {t.is_active ? '公開中' : '非公開'}
                  </button>
                  <button className="btn-edit" onClick={() => openEdit(t)}>編集</button>
                  <button className="btn-delete" onClick={() => handleDelete(t)}>削除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className="modal">
            <h3 className="modal-title">{editing ? '大会を編集' : '大会を追加'}</h3>

            <div className="form-group">
              <label className="form-label">大会名 <span className="required">*</span></label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="第12回 サマーカップ"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">年度 <span className="required">*</span></label>
                <input
                  className="form-input"
                  value={form.fiscal_year}
                  onChange={e => setForm(f => ({ ...f, fiscal_year: e.target.value }))}
                  placeholder="2026"
                  disabled={!!editing}
                />
                {editing && (
                  <p className="form-hint">年度は作成後に変更できません。</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">出場枠（チーム数）</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  placeholder="16"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">開催日 <span className="required">*</span></label>
              <input
                className="form-input"
                type="date"
                value={form.event_date}
                onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">会場 <span className="required">*</span></label>
              <input
                className="form-input"
                value={form.venue}
                onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                placeholder="市民総合体育館"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">エントリー開始日時</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={form.entry_start_at}
                  onChange={e => setForm(f => ({ ...f, entry_start_at: e.target.value }))}
                />
                <p className="form-hint">未設定の場合はすぐにエントリー可能です。</p>
              </div>
              <div className="form-group">
                <label className="form-label">エントリー終了日時</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={form.entry_end_at}
                  onChange={e => setForm(f => ({ ...f, entry_end_at: e.target.value }))}
                />
                <p className="form-hint">未設定の場合は開催日の1週間前までです。</p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label-check">
                <input
                  type="checkbox"
                  checked={form.entry_limit_enabled}
                  onChange={e => setForm(f => ({ ...f, entry_limit_enabled: e.target.checked }))}
                />
                エントリー制限をかける（同一年度は1アカウント1エントリー）
              </label>
              <p className="form-hint">
                オフの場合は、この大会に1アカウント1エントリーの制限のみが適用され、
                他の大会には制限なくエントリーできます。
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">説明</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="大会の説明文"
              />
            </div>

            <div className="form-group">
              <label className="form-label-check">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                />
                公開する
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn-next" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
              <button className="btn-back" onClick={closeForm}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
