import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function TestHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { foods, openManualModal, showToast } = useApp();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [food, setFood] = useState(searchParams.get('food') || 'all');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [page, setPage] = useState(parseInt(searchParams.get('page'), 10) || 1);

  const [rows, setRows] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [historyDays, setHistoryDays] = useState(20);
  const [loading, setLoading] = useState(false);

  // Fetch settings for retention days
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.historyDays) {
          setHistoryDays(j.data.historyDays);
        }
      })
      .catch(() => {});
  }, []);

  const fetchHistory = useCallback(async (p, f, s, q) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', p);
      params.set('limit', 20);
      if (f && f !== 'all') params.set('food', f);
      if (s && s !== 'all') params.set('status', s);
      if (q && q.trim()) params.set('search', q.trim());

      const res = await fetch(`/api/history?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRows(json.data || []);
        setTotalRecords(json.total || 0);
        setTotalPages(json.totalPages || 1);
      }
    } catch (e) {
      console.error('Error fetching history:', e);
      showToast('Failed to load history logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const curPage = parseInt(searchParams.get('page'), 10) || 1;
    const curFood = searchParams.get('food') || 'all';
    const curStatus = searchParams.get('status') || 'all';
    const curSearch = searchParams.get('search') || '';

    setPage(curPage);
    setFood(curFood);
    setStatus(curStatus);
    setSearch(curSearch);

    fetchHistory(curPage, curFood, curStatus, curSearch);
  }, [searchParams, fetchHistory]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    const newParams = { page: 1 };
    if (food !== 'all') newParams.food = food;
    if (status !== 'all') newParams.status = status;
    if (search.trim()) newParams.search = search.trim();
    setSearchParams(newParams);
  };

  const handleReset = () => {
    setSearch('');
    setFood('all');
    setStatus('all');
    setSearchParams({ page: 1 });
  };

  const handlePageChange = (newPage) => {
    const newParams = Object.fromEntries(searchParams.entries());
    newParams.page = newPage;
    setSearchParams(newParams);
  };

  const deleteRow = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sensor reading record?')) return;
    try {
      const res = await fetch(`/api/readings/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Record deleted successfully', 'success');
        setRows(prev => prev.filter(r => r.id !== id));
        setTotalRecords(prev => Math.max(0, prev - 1));
      } else {
        showToast(json.message || 'Delete failed', 'error');
      }
    } catch (e) {
      showToast('Failed to delete reading', 'error');
    }
  };

  const confirmClearHistory = async () => {
    if (
      !window.confirm(
        '⚠️ WARNING: This will permanently delete ALL recorded sensor readings from the database. Are you sure?'
      )
    ) {
      return;
    }
    try {
      const res = await fetch('/api/readings/clear', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('All historical readings cleared', 'info');
        setRows([]);
        setTotalRecords(0);
        setTotalPages(1);
      }
    } catch (e) {
      showToast('Failed to clear database', 'error');
    }
  };

  const triggerTestReading = async () => {
    try {
      const res = await fetch('/api/simulate/reading', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('Generated sample reading', 'success');
        fetchHistory(page, food, status, search);
      }
    } catch (e) {
      showToast('Error generating reading', 'error');
    }
  };

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <h1>Test History &amp; Audit Logs</h1>
          <p>
            Complete historical sensor records, quality classifications, and compliance metrics (Rolling {historyDays}-day retention).
          </p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-emerald" onClick={openManualModal}>
            ＋ New Test Record
          </button>
          <a className="btn btn-outline" href="/api/history/export-csv" download>
            ⇩ Download CSV
          </a>
          <a className="btn btn-outline" href="/api/history" target="_blank" rel="noreferrer">
            ⇩ Raw JSON
          </a>
          <button className="btn btn-outline-danger" onClick={confirmClearHistory}>
            🗑️ Clear History
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card filter-bar-card">
        <form className="filter-form" onSubmit={handleFilterSubmit}>
          <div className="filter-inputs">
            <div className="form-group-inline">
              <label htmlFor="search">Search</label>
              <input
                type="text"
                id="search"
                name="search"
                className="form-control"
                placeholder="Search by ID, color, status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="form-group-inline">
              <label htmlFor="food">Food Item</label>
              <select
                id="food"
                name="food"
                className="form-control"
                value={food}
                onChange={(e) => setFood(e.target.value)}
              >
                <option value="all">All Foods</option>
                {(foods || []).map(f => (
                  <option key={f.key} value={f.key}>
                    {f.icon} {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group-inline">
              <label htmlFor="status">Quality Status</label>
              <select
                id="status"
                name="status"
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="FRESH">Fresh (&gt;=80)</option>
                <option value="WARNING">Warning (55-79)</option>
                <option value="SPOILED">Spoiled (&lt;55)</option>
              </select>
            </div>
          </div>

          <div className="filter-buttons">
            <button type="submit" className="btn btn-primary">
              Apply Filters
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleReset}>
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Historical Data Table */}
      <section className="card history-table-card">
        <div className="card-header">
          <div className="card-title">
            <span>📋</span>
            <b>Inspection Records</b>
            <span className="badge badge-subtle">{totalRecords} Total Matching Records</span>
          </div>
          <div className="table-legend">
            <span className="legend-item"><i className="dot dot-green"></i> Fresh</span>
            <span className="legend-item"><i className="dot dot-amber"></i> Warning</span>
            <span className="legend-item"><i className="dot dot-red"></i> Spoiled</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Food Item</th>
                <th>pH Level</th>
                <th>Gas (MQ135)</th>
                <th>Temp (°C)</th>
                <th>Humidity</th>
                <th>TDS</th>
                <th>Color</th>
                <th>Quality Score</th>
                <th>Status</th>
                <th>Source</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="12" className="text-center" style={{ padding: '40px' }}>
                    <div className="empty-state">
                      <span style={{ fontSize: '36px' }}>🍃</span>
                      <h3>No Records Found</h3>
                      <p className="text-muted">No sensor readings match your current filters.</p>
                      <button className="btn btn-primary btn-sm" onClick={triggerTestReading}>
                        Generate Test Reading
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map(r => {
                  const foodObj = foods.find(f => f.key === r.foodType);
                  const scoreClass =
                    r.qualityScore >= 80 ? 'high' : r.qualityScore >= 55 ? 'med' : 'low';
                  return (
                    <tr key={r.id} id={`row-${r.id}`}>
                      <td>
                        {new Date(r.timestamp).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td>
                        <span className="food-chip">
                          {foodObj ? foodObj.icon : '🍽️'} {foodObj ? foodObj.name : r.foodType}
                        </span>
                      </td>
                      <td><b>{r.ph}</b></td>
                      <td>{r.gas} ppm</td>
                      <td>{r.temperature} °C</td>
                      <td>{r.humidity} %</td>
                      <td>{r.tds}</td>
                      <td>{r.color || 'Normal'}</td>
                      <td>
                        <span className={`score-badge ${scoreClass}`}>
                          {r.qualityScore} / 100
                        </span>
                      </td>
                      <td>
                        <span className={`status-chip ${r.status.toLowerCase()}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-source">{r.source || 'ESP32'}</span>
                      </td>
                      <td>
                        <div className="action-btn-group">
                          <Link
                            to={`/reading/${r.id}`}
                            className="btn-table-action"
                            title="View Full Inspection Certificate"
                          >
                            Certificate ↗
                          </Link>
                          <button
                            className="btn-table-delete"
                            onClick={() => deleteRow(r.id)}
                            title="Delete this entry"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-footer">
            <span className="page-info">
              Page <b>{page}</b> of <b>{totalPages}</b> ({totalRecords} records)
            </span>
            <div className="page-nav">
              {page > 1 && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => handlePageChange(page - 1)}
                >
                  ← Prev
                </button>
              )}
              {Array.from(
                { length: Math.min(5, totalPages) },
                (_, i) => {
                  let pNum;
                  if (totalPages <= 5) pNum = i + 1;
                  else if (page <= 3) pNum = i + 1;
                  else if (page >= totalPages - 2) pNum = totalPages - 4 + i;
                  else pNum = page - 2 + i;
                  return (
                    <button
                      key={pNum}
                      className={`btn btn-sm ${pNum === page ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => handlePageChange(pNum)}
                    >
                      {pNum}
                    </button>
                  );
                }
              )}
              {page < totalPages && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => handlePageChange(page + 1)}
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </section>
  );
}
