import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import './Pending.css';

const MAIN_APP_ORIGIN = 'http://localhost:5174';

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ── Comment Modal (Reject / Cancel) ── */
function CommentModal({ title, placeholder, confirmLabel, confirmClass, onConfirm, onCancel, optional }) {
  const [comment, setComment] = useState('');
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <textarea
          className="modal-textarea"
          placeholder={placeholder}
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={4}
          autoFocus
        />
        <div className="modal-actions">
          <button className="btn btn-outline btn-sm" onClick={onCancel}>Back</button>
          <button
            className={`btn btn-sm ${confirmClass}`}
            onClick={() => onConfirm(comment)}
            disabled={!optional && !comment.trim()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function Pending() {
  const { workorders, loading, error, approveWorkorder, rejectWorkorder, cancelWorkorder } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter,  setDateFilter]  = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [toast,       setToast]       = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  /* ── Only Pending Approval workorders ── */
  const pendingOrders = useMemo(() => {
    return [...workorders]
      .filter(w => w.status === 'Pending Approval')
      .sort((a, b) => {
        const da = new Date(a.createdAt), db = new Date(b.createdAt);
        return (!isNaN(db) && !isNaN(da)) ? db - da : 0;
      });
  }, [workorders]);

  /* ── Search + Date filter ── */
  const displayOrders = useMemo(() => {
    return pendingOrders.filter(wo => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q ||
        wo.name.toLowerCase().includes(q) ||
        wo.id.toLowerCase().includes(q) ||
        (wo.createdBy || '').toLowerCase().includes(q);

      const matchesDate = !dateFilter || (() => {
        const [y, m, d] = dateFilter.split('-').map(Number);
        const dt = new Date(wo.createdAt);
        return !isNaN(dt) && dt.getFullYear() === y && (dt.getMonth() + 1) === m && dt.getDate() === d;
      })();

      return matchesSearch && matchesDate;
    });
  }, [pendingOrders, searchQuery, dateFilter]);

  /* ── Handlers ── */
  const handleApprove = async (e, id) => {
    e.stopPropagation();
    await approveWorkorder(id);
    showToast('✓ Workorder approved successfully');
  };

  const handleReject = async (comment) => {
    await rejectWorkorder(rejectModal, comment);
    setRejectModal(null);
    showToast('Workorder rejected');
  };

  const handleCancel = async (comment) => {
    await cancelWorkorder(cancelModal, comment);
    setCancelModal(null);
    showToast('Workorder cancelled');
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="loading-state">
      <div className="spinner" />
      <p>Loading workorders…</p>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="error-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{error}</p>
      <p className="error-hint">Make sure the backend is running on <code>http://localhost:5001</code></p>
    </div>
  );

  return (
    <div className="page-container pending-page">

      {/* Toast */}
      {toast && <div className="toast-msg">{toast}</div>}

      {/* Modals */}
      {rejectModal && (
        <CommentModal
          title="Reject Workorder"
          placeholder="Enter rejection reason…"
          confirmLabel="Reject"
          confirmClass="btn-danger"
          onConfirm={handleReject}
          onCancel={() => setRejectModal(null)}
        />
      )}
      {cancelModal && (
        <CommentModal
          title="Cancel Workorder"
          placeholder="Enter cancellation reason (optional)…"
          confirmLabel="Cancel WO"
          confirmClass="btn-cancel-wo"
          onConfirm={handleCancel}
          onCancel={() => setCancelModal(null)}
          optional
        />
      )}

      {/* ── Page Header ── */}
      <div className="pending-page-header">
        <div className="pending-header-left">
          <h1 className="page-title">Pending Approval</h1>
          <p className="page-subtitle">Review and act on workorders awaiting your approval</p>
        </div>
        <div className="pending-stat-chip pending-stat-chip--blue">
          <span className="pending-stat-chip-value">{pendingOrders.length}</span>
          <span className="pending-stat-chip-label">Awaiting Review</span>
        </div>
      </div>

      {/* ── Toolbar: Search + Date ── */}
      <div className="pending-toolbar">
        {/* Search */}
        <div className="pending-search-wrap">
          <svg className="pending-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            id="pending-search"
            type="text"
            className="pending-search-input"
            placeholder="Search by name, ID or creator…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="pending-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">×</button>
          )}
        </div>

        {/* Date filter */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <input
            id="pending-date-filter"
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="date-input"
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="date-clear-btn" aria-label="Clear date">×</button>
          )}
        </div>

        {/* Clear all */}
        {(searchQuery || dateFilter) && (
          <button
            className="clear-all-btn"
            onClick={() => { setSearchQuery(''); setDateFilter(''); }}
          >
            ✕ Clear filters
          </button>
        )}

        {/* Result count */}
        {(searchQuery || dateFilter) && (
          <span className="result-count">
            {displayOrders.length} of {pendingOrders.length} shown
          </span>
        )}
      </div>

      {/* ── Cards ── */}
      {displayOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>
          <h3>
            {searchQuery || dateFilter
              ? 'No results found'
              : 'No pending workorders'}
          </h3>
          <p>
            {searchQuery
              ? `No pending workorders match "${searchQuery}"`
              : dateFilter
              ? 'No pending workorders on that date'
              : 'All caught up! Workorders submitted for approval will appear here.'}
          </p>
        </div>
      ) : (
        <div className="pending-list">
          {displayOrders.map((wo, index) => {
            const totalItems = wo.groups?.reduce((sum, g) => sum + g.items.length, 0) ?? 0;
            const isFirst  = index === 0;
            const isSecond = index === 1;

            return (
              <div
                key={wo.id}
                id={`workorder-card-${wo.id}`}
                className={`pending-card ${isFirst ? 'priority-high' : isSecond ? 'priority-medium' : ''}`}
              >
                {/* Priority stripe */}
                {isFirst  && <div className="pending-card-stripe pending-card-stripe--high" />}
                {isSecond && <div className="pending-card-stripe pending-card-stripe--medium" />}

                {/* Header row */}
                <div className="pending-card-header">
                  <div className="pending-card-meta">
                    <span className="pending-card-id">{wo.id}</span>
                    <StatusBadge status={wo.status} />
                    {isFirst && (
                      <span className="priority-badge priority-badge--high">Needs attention</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="card-action-group">
                    <button
                      id={`approve-btn-${wo.id}`}
                      className="btn btn-sm btn-approve"
                      onClick={e => handleApprove(e, wo.id)}
                      title="Approve this workorder"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Approve
                    </button>

                    <button
                      id={`reject-btn-${wo.id}`}
                      className="btn btn-sm btn-reject"
                      onClick={e => { e.stopPropagation(); setRejectModal(wo.id); }}
                      title="Reject this workorder"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Reject
                    </button>

                    <button
                      id={`cancel-btn-${wo.id}`}
                      className="btn btn-sm btn-cancel-outline"
                      onClick={e => { e.stopPropagation(); setCancelModal(wo.id); }}
                      title="Cancel this workorder"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                      </svg>
                      Cancel
                    </button>

                    <button
                      id={`review-btn-${wo.id}`}
                      className="btn btn-sm btn-review"
                      onClick={e => { e.stopPropagation(); window.open(`${MAIN_APP_ORIGIN}/approval/${wo.id}`, '_blank'); }}
                      title="Open full review page"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                      </svg>
                      Full Review
                    </button>
                  </div>
                </div>

                {/* Title + meta */}
                <h3 className="pending-card-title">{wo.name}</h3>
                <p className="pending-card-subtitle">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  {wo.createdBy}
                  <span className="card-subtitle-dot">·</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8"  y1="2" x2="8"  y2="6"/>
                    <line x1="3"  y1="10" x2="21" y2="10"/>
                  </svg>
                  {formatDate(wo.createdAt)}
                </p>

                {/* Footer */}
                <div className="pending-card-footer">
                  <div className="pending-stat">
                    <span className="pending-stat-value">{wo.groups?.length ?? 0}</span>
                    <span className="pending-stat-label">Groups</span>
                  </div>
                  <div className="pending-card-divider"/>
                  <div className="pending-stat">
                    <span className="pending-stat-value">{totalItems}</span>
                    <span className="pending-stat-label">Items</span>
                  </div>
                  <div className="pending-card-divider"/>
                  <div className="pending-stat">
                    <span className="pending-stat-value">{wo.auditTrail?.length ?? 0}</span>
                    <span className="pending-stat-label">Audit events</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
