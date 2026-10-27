import React, { useState, useEffect } from 'react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'customer-info', label: 'Customer Info' },
  { id: 'data-mapping', label: 'Data Mapping' },
  { id: 'tenant-setup', label: 'Tenant Setup' },
  { id: 'import', label: 'Import' }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [onboardingData, setOnboardingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOnboarding = () => {
    fetch('/api/onboarding')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid response format');
        return data;
      })
      .then(data => {
        setOnboardingData(data);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch onboarding data:', err);
        setError(err.message);
        setOnboardingData([]);
        setLoading(false);
      });
  };

  useEffect(loadOnboarding, []);

  return (
    <div className="app">
      <header>
        <h1>Onboarding Dashboard</h1>
        <p>Customer Success Team - Internal Tool</p>
      </header>

      <nav className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'dashboard' && (
          <DashboardTab data={onboardingData} loading={loading} error={error} />
        )}
        {activeTab === 'customer-info' && (
          <CustomerInfoTab onCreated={loadOnboarding} />
        )}
        {activeTab === 'data-mapping' && (
          <DataMappingTab customers={onboardingData} onSaved={loadOnboarding} />
        )}
        {activeTab === 'tenant-setup' && (
          <PlaceholderTab title="Tenant Setup" description="Provision and configure customer tenant" />
        )}
        {activeTab === 'import' && (
          <PlaceholderTab title="Import" description="Import customer data into the platform" />
        )}
      </main>
    </div>
  );
}

function DashboardTab({ data, loading, error }) {
  if (loading) {
    return <div className="placeholder"><p>Loading...</p></div>;
  }

  if (error) {
    return (
      <div className="placeholder">
        <p style={{ color: '#dc2626' }}>⚠️ Failed to load onboarding data</p>
        <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="placeholder"><p>No customers in the onboarding queue</p></div>;
  }

  return (
    <div>
      <h2>Onboarding Queue</h2>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>
        {data.length} customer(s) awaiting onboarding
      </p>

      {data.map(item => (
        <div key={item.customerId} className="customer-card">
          <h3>{item.customerName}</h3>
          <div className="customer-meta">
            <span>📍 {item.customerRegion}</span>
            <span>🏭 {item.customerIndustry}</span>
          </div>

          <div className="progress-section">
            <ProgressBar percent={item.progressPercent} />
            <Checklist steps={item.steps} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ percent }) {
  return (
    <div className="progress-bar-container">
      <div 
        className="progress-bar" 
        style={{ width: `${Math.max(percent, 0)}%` }}
      >
        {percent > 0 ? `${percent}%` : ''}
      </div>
    </div>
  );
}

function Checklist({ steps }) {
  return (
    <ul className="checklist">
      {steps.map(step => (
        <li key={step.id}>
          <span className={`step-status ${step.status}`}>
            {step.status === 'completed' ? '✓' : step.order}
          </span>
          <span>{step.name}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#9ca3af' }}>
            {step.status.replace('_', ' ')}
          </span>
        </li>
      ))}
    </ul>
  );
}

const EMPTY_CUSTOMER = { name: '', industry: '', region: '', contactEmail: '' };

function CustomerInfoTab({ onCreated }) {
  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [created, setCreated] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setSubmitError(null);
    setCreated(null);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const body = await res.json();
      if (res.status === 400 && body.errors) {
        setErrors(body.errors);
      } else if (!res.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      } else {
        setCreated(body);
        setForm(EMPTY_CUSTOMER);
        onCreated();
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const field = (id, label, type = 'text') => (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={form[id]} onChange={update(id)} />
      {errors[id] && <span className="field-error" role="alert">{errors[id]}</span>}
    </div>
  );

  return (
    <div>
      <h2>Customer Info</h2>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>Create a new customer to onboard</p>
      <form className="customer-form" onSubmit={submit} noValidate>
        {field('name', 'Name')}
        {field('industry', 'Industry')}
        {field('region', 'Region')}
        {field('contactEmail', 'Contact Email', 'email')}
        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Customer'}
        </button>
      </form>
      {submitError && <p className="field-error" role="alert">{submitError}</p>}
      {created && <p className="form-success" role="status">Created customer {created.name}</p>}
    </div>
  );
}

// Header row only; quoted commas are handled so "Smith, John" stays one column
function parseCsvHeader(text) {
  const line = text.split(/\r?\n/)[0] || '';
  const cols = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { cols.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  cols.push(cur.trim());
  return cols.filter(Boolean);
}

function DataMappingTab({ customers, onSaved }) {
  const [customerId, setCustomerId] = useState('');
  const [fields, setFields] = useState([]);
  const [columns, setColumns] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/mappings/clients/fields')
      .then(res => {
        if (!res.ok) throw new Error(`Could not load platform fields (HTTP ${res.status})`);
        return res.json();
      })
      .then(setFields)
      .catch(err => setMessage({ error: true, text: err.message }));
  }, []);

  const selectCustomer = (id) => {
    setCustomerId(id);
    setColumns(null);
    setErrors({});
    setMessage(null);
  };

  useEffect(() => {
    if (!customerId) return;
    fetch(`/api/customers/${customerId}/mappings/clients`)
      .then(res => (res.ok ? res.json() : null))
      .then(mapping => mapping && setColumns(mapping.columns))
      .catch(() => {});
  }, [customerId]);

  const loadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setErrors({});
    setMessage(null);
    const headers = parseCsvHeader(await file.text());
    if (headers.length === 0) {
      setMessage({ error: true, text: 'No columns found in file' });
      return;
    }
    try {
      const res = await fetch('/api/mappings/clients/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers })
      });
      if (!res.ok) throw new Error(`Could not suggest a mapping (HTTP ${res.status})`);
      setColumns((await res.json()).columns);
    } catch (err) {
      setMessage({ error: true, text: err.message });
    }
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/mappings/clients`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns })
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 400 && body.errors) {
        setErrors(body.errors);
      } else if (!res.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      } else {
        setMessage({ text: 'Mapping saved' });
        onSaved();
      }
    } catch (err) {
      setMessage({ error: true, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2>Data Mapping</h2>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>
        Map the customer&apos;s client file columns to platform fields
      </p>

      <div className="customer-form">
        <div className="form-field">
          <label htmlFor="mapping-customer">Customer</label>
          <select id="mapping-customer" value={customerId} onChange={e => selectCustomer(e.target.value)}>
            <option value="">Select a customer</option>
            {customers.map(c => (
              <option key={c.customerId} value={c.customerId}>{c.customerName}</option>
            ))}
          </select>
        </div>

        {customerId && (
          <div className="form-field">
            <label htmlFor="mapping-file">Clients CSV</label>
            <input id="mapping-file" type="file" accept=".csv,text/csv" onChange={loadFile} />
          </div>
        )}
      </div>

      {customerId && columns && (
        <>
          <table className="mapping-table">
            <thead>
              <tr><th>Source column</th><th>Platform field</th></tr>
            </thead>
            <tbody>
              {Object.entries(columns).map(([col, target]) => (
                <tr key={col}>
                  <td>{col}</td>
                  <td>
                    <select
                      aria-label={`Target for ${col}`}
                      value={target || ''}
                      onChange={e => setColumns({ ...columns, [col]: e.target.value || null })}
                    >
                      <option value="">— Ignore —</option>
                      {fields.map(f => (
                        <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {Object.entries(errors).map(([key, text]) => (
            <p key={key} className="field-error" role="alert">{text}</p>
          ))}
          <button type="button" className="submit-btn" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Mapping'}
          </button>
        </>
      )}

      {message && (
        <p className={message.error ? 'field-error' : 'form-success'} role={message.error ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </div>
  );
}

function PlaceholderTab({ title, description }) {
  return (
    <div className="placeholder">
      <h2>{title}</h2>
      <p>{description}</p>
      <p style={{ marginTop: '20px', fontSize: '0.9rem' }}>
        🚧 This section is ready to be built
      </p>
    </div>
  );
}

export default App;
