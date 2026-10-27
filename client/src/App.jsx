import React, { useState, useEffect, useCallback } from 'react';

// Keep in sync with server/src/services/customers.js
const REGIONS = ['North America', 'United Kingdom', 'Europe', 'Asia Pacific'];
const CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD'];
const PLANS = ['starter', 'professional', 'enterprise'];
const DATE_FORMATS = ['MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'];
const DEFAULT_CURRENCY = {
  'North America': 'USD',
  'United Kingdom': 'GBP',
  'Europe': 'EUR',
  'Asia Pacific': 'AUD'
};

// Dev-only: prefill forms with faker data. Skipped in automated browsers
// (Playwright sets navigator.webdriver) so e2e specs start from empty forms.
const PREFILL = import.meta.env.DEV && !navigator.webdriver;

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
  const [createdName, setCreatedName] = useState(null);

  const loadDashboard = useCallback(() => {
    return fetch('/api/onboarding')
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
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleCustomerCreated = (customer) => {
    setCreatedName(customer.name);
    setActiveTab('dashboard');
    loadDashboard();
  };

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
            onClick={() => {
              setActiveTab(tab.id);
              setCreatedName(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'dashboard' && (
          <DashboardTab
            data={onboardingData}
            loading={loading}
            error={error}
            createdName={createdName}
            onNewCustomer={() => setActiveTab('customer-info')}
          />
        )}
        {activeTab === 'customer-info' && (
          <CustomerInfoTab onCreated={handleCustomerCreated} />
        )}
        {activeTab === 'data-mapping' && (
          <DataMappingTab customers={onboardingData} onSaved={loadDashboard} />
        )}
        {activeTab === 'tenant-setup' && (
          <TenantSetupTab customers={onboardingData} onChanged={loadDashboard} />
        )}
        {activeTab === 'import' && (
          <PlaceholderTab title="Import" description="Import customer data into the platform" />
        )}
      </main>
    </div>
  );
}

function DashboardTab({ data, loading, error, createdName, onNewCustomer }) {
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
    return (
      <div className="placeholder">
        <p>No customers in the onboarding queue</p>
        <button className="button primary" style={{ marginTop: '16px' }} onClick={onNewCustomer}>
          New customer
        </button>
      </div>
    );
  }

  return (
    <div>
      {createdName && (
        <p className="notice success" role="status">{createdName} added to the onboarding queue</p>
      )}
      <div className="section-header">
        <h2>Onboarding Queue</h2>
        <button className="button primary" onClick={onNewCustomer}>New customer</button>
      </div>
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

const EMPTY_CUSTOMER = {
  name: '',
  industry: '',
  region: '',
  contactEmail: '',
  currency: '',
  dateFormat: '',
  plan: 'starter'
};

function CustomerInfoTab({ onCreated }) {
  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fillSample = useCallback(() => {
    if (!import.meta.env.DEV) return;
    import('./sampleData.js').then(m => setForm(m.sampleCustomer({
      regions: REGIONS,
      currencies: CURRENCIES,
      dateFormats: DATE_FORMATS,
      plans: PLANS,
      defaultCurrency: DEFAULT_CURRENCY
    })));
  }, []);

  useEffect(() => {
    if (PREFILL) fillSample();
  }, [fillSample]);

  const update = (key) => (event) => {
    const value = event.target.value;
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Suggest the region's usual currency until the user picks one
      if (key === 'region' && !prev.currency) {
        next.currency = DEFAULT_CURRENCY[value] || '';
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFieldErrors(body.fields || {});
        setSubmitError(body.error || `HTTP ${res.status}`);
        return;
      }
      setForm(EMPTY_CUSTOMER);
      if (PREFILL) fillSample();
      onCreated(body.customer);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="customer-form" onSubmit={handleSubmit} noValidate>
      <h2>New customer</h2>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>
        Add a customer to the onboarding queue
      </p>

      <FormField id="customer-name" label="Name" error={fieldErrors.name}>
        <input id="customer-name" value={form.name} onChange={update('name')} required />
      </FormField>

      <FormField id="customer-industry" label="Industry" error={fieldErrors.industry}>
        <input id="customer-industry" value={form.industry} onChange={update('industry')} />
      </FormField>

      <FormField id="customer-region" label="Region" error={fieldErrors.region}>
        <select id="customer-region" value={form.region} onChange={update('region')} required>
          <option value="">Choose a region…</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </FormField>

      <FormField id="customer-email" label="Contact email" error={fieldErrors.contactEmail}>
        <input id="customer-email" type="email" value={form.contactEmail} onChange={update('contactEmail')} required />
      </FormField>

      <FormField id="customer-currency" label="Currency" error={fieldErrors.currency}>
        <select id="customer-currency" value={form.currency} onChange={update('currency')} required>
          <option value="">Choose a currency…</option>
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </FormField>

      <FormField
        id="customer-date-format"
        label="Date format"
        hint="The format used in the customer's files. Dates like 03/05/2024 can't be read reliably without it."
        error={fieldErrors.dateFormat}
      >
        <select id="customer-date-format" value={form.dateFormat} onChange={update('dateFormat')} required>
          <option value="">Choose a date format…</option>
          {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </FormField>

      <FormField id="customer-plan" label="Plan" error={fieldErrors.plan}>
        <select id="customer-plan" value={form.plan} onChange={update('plan')}>
          {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </FormField>

      {submitError && <p className="notice error" role="alert">{submitError}</p>}

      <button type="submit" className="button primary" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save customer'}
      </button>
      {import.meta.env.DEV && (
        <button type="button" className="button" onClick={fillSample} style={{ marginLeft: '8px' }}>
          Fill sample data
        </button>
      )}
    </form>
  );
}

function FormField({ id, label, hint, error, children }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
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

const EMPTY_TENANT_FORM = { plan: '', subdomain: '', adminEmail: '' };

function TenantSetupTab({ customers, onChanged }) {
  const [customerId, setCustomerId] = useState('');
  const [plans, setPlans] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [form, setForm] = useState(EMPTY_TENANT_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    fetch('/api/tenants/plans')
      .then(res => {
        if (!res.ok) throw new Error(`Could not load plans (HTTP ${res.status})`);
        return res.json();
      })
      .then(setPlans)
      .catch(err => setSubmitError(err.message));
  }, []);

  const selectCustomer = (id) => {
    setCustomerId(id);
    setTenant(null);
    setForm(EMPTY_TENANT_FORM);
    setErrors({});
    setSubmitError(null);
    setActivated(false);
  };

  // Load the current tenant when a customer is selected
  useEffect(() => {
    if (!customerId) return undefined;
    let cancelled = false;
    fetch(`/api/tenants/${customerId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(t => { if (!cancelled && t) setTenant(t); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [customerId]);

  const status = tenant ? tenant.status : null;

  // Poll while provisioning
  useEffect(() => {
    if (!customerId || status !== 'provisioning') return undefined;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/tenants/${customerId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const t = await res.json();
        if (cancelled || (t.status !== 'active' && t.status !== 'failed')) return;
        setTenant(t);
        setActivated(t.status === 'active');
        onChanged();
      } catch (err) {
        if (!cancelled) setSubmitError(`Could not check provisioning status: ${err.message}`);
      }
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [customerId, status, onChanged]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const fillSample = () => {
    if (!import.meta.env.DEV) return;
    import('./sampleData.js').then(m => setForm(m.sampleTenant({ plans })));
  };

  // Prefill once the plans are loaded and a customer is chosen
  useEffect(() => {
    if (PREFILL && customerId && plans.length) fillSample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, plans]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setSubmitError(null);
    setActivated(false);
    try {
      const res = await fetch(`/api/customers/${customerId}/tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 400 && body.errors) {
        setErrors(body.errors);
      } else if (!res.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      } else {
        setTenant(body);
        onChanged();
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const provisioning = status === 'provisioning';
  const showForm = customerId && status !== 'active';

  return (
    <div>
      <h2>Tenant Setup</h2>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>Provision and configure customer tenant</p>
      <div className="customer-form">
        <div className="form-field">
          <label htmlFor="tenant-customer">Customer</label>
          <select id="tenant-customer" value={customerId} onChange={e => selectCustomer(e.target.value)}>
            <option value="">Select a customer</option>
            {customers.map(c => (
              <option key={c.customerId} value={c.customerId}>{c.customerName}</option>
            ))}
          </select>
        </div>
      </div>

      {tenant && <p className={`tenant-badge ${tenant.status}`}>Status: {tenant.status}</p>}

      {showForm && (
        <form className="customer-form" onSubmit={submit} noValidate>
          <fieldset disabled={provisioning || submitting} style={{ border: 'none', padding: 0 }}>
            <div className="form-field">
              <label htmlFor="tenant-plan">Plan</label>
              <select id="tenant-plan" value={form.plan} onChange={update('plan')}>
                <option value="">Select a plan</option>
                {plans.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
              {errors.plan && <span className="field-error" role="alert">{errors.plan}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="tenant-subdomain">Subdomain</label>
              <input
                id="tenant-subdomain"
                type="text"
                value={form.subdomain}
                onChange={update('subdomain')}
                aria-describedby="tenant-subdomain-hint"
              />
              <span id="tenant-subdomain-hint" className="field-hint">
                {(form.subdomain || '<subdomain>')}.platform.example
              </span>
              {errors.subdomain && <span className="field-error" role="alert">{errors.subdomain}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="tenant-admin-email">Admin Email</label>
              <input id="tenant-admin-email" type="email" value={form.adminEmail} onChange={update('adminEmail')} />
              {errors.adminEmail && <span className="field-error" role="alert">{errors.adminEmail}</span>}
            </div>
            <button type="submit" className="submit-btn">
              {provisioning || submitting ? 'Provisioning...' : 'Provision Tenant'}
            </button>
          </fieldset>
        </form>
      )}

      {status === 'failed' && tenant.error && (
        <p className="field-error" role="alert">Provisioning failed: {tenant.error}</p>
      )}
      {submitError && <p className="field-error" role="alert">{submitError}</p>}
      {activated && tenant && (
        <p className="form-success" role="status">Tenant {tenant.subdomain} is active</p>
      )}

      {status === 'active' && (
        <dl className="tenant-details">
          <dt>Plan</dt>
          <dd>{tenant.plan}</dd>
          <dt>URL</dt>
          <dd>https://{tenant.subdomain}.platform.example</dd>
          <dt>Admin Email</dt>
          <dd>{tenant.adminEmail}</dd>
        </dl>
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
