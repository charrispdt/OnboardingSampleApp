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
          <PlaceholderTab title="Data Mapping" description="Map customer data to platform configuration" />
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
