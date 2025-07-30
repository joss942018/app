import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';

// Context for authentication
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('lexai_token');
    if (token) {
      // Verify token and get user info
      const userData = localStorage.getItem('lexai_user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('lexai_token', data.token);
      localStorage.setItem('lexai_user', JSON.stringify(data.user));
      setUser(data.user);
      return true;
    }
    return false;
  };

  const register = async (email, password, name, organizationName) => {
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name,
        organization_name: organizationName
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('lexai_token', data.token);
      localStorage.setItem('lexai_user', JSON.stringify(data.user));
      setUser(data.user);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('lexai_token');
    localStorage.removeItem('lexai_user');
    setUser(null);
  };

  if (loading) {
    return <div className="loading-screen">Cargando LexAI...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      <div className="App">
        {user ? <MainApp /> : <AuthScreen />}
      </div>
    </AuthContext.Provider>
  );
}

// Authentication Screen
function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    organizationName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let success;
      if (isLogin) {
        success = await login(formData.email, formData.password);
      } else {
        success = await register(formData.email, formData.password, formData.name, formData.organizationName);
      }

      if (!success) {
        setError(isLogin ? 'Credenciales inválidas' : 'Error al crear la cuenta');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">LexAI</h1>
          <p className="auth-subtitle">Plataforma Inteligente para Abogados</p>
        </div>

        <div className="auth-tabs">
          <button 
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Iniciar Sesión
          </button>
          <button 
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Nombre del Despacho</label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({...formData, organizationName: e.target.value})}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
          </button>
        </form>
      </div>
    </div>
  );
}

// Main Application
function MainApp() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();

  return (
    <div className="main-app">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        user={user}
        logout={logout}
      />
      <div className={`main-content ${!sidebarOpen ? 'expanded' : ''}`}>
        <TopBar 
          setSidebarOpen={setSidebarOpen}
          sidebarOpen={sidebarOpen}
          user={user}
        />
        <div className="content-area">
          {renderCurrentView(currentView, setCurrentView)}
        </div>
      </div>
    </div>
  );
}

// Sidebar Component
function Sidebar({ currentView, setCurrentView, sidebarOpen, setSidebarOpen, user, logout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'legal-categories', label: 'Asistente Legal', icon: '🤖' },
    { id: 'chat-history', label: 'Historial Chat', icon: '💬' },
    { id: 'cases-dashboard', label: 'Mis Casos', icon: '📁' },
    { id: 'new-case', label: 'Nuevo Caso', icon: '➕' },
    { id: 'document-analysis', label: 'Análisis Documentos', icon: '📄' },
  ];

  return (
    <div className={`sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">LexAI</h2>
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? '←' : '→'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => setCurrentView(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {sidebarOpen && <span className="nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          {sidebarOpen && (
            <>
              <div className="user-name">{user.name}</div>
              <div className="user-org">{user.organization}</div>
            </>
          )}
        </div>
        <button className="logout-button" onClick={logout}>
          {sidebarOpen ? 'Cerrar Sesión' : '🚪'}
        </button>
      </div>
    </div>
  );
}

// Top Bar Component
function TopBar({ setSidebarOpen, sidebarOpen, user }) {
  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <button 
          className="menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <h1 className="page-title">Panel de Control</h1>
      </div>
      <div className="top-bar-right">
        <div className="user-badge">
          <span className="user-avatar">👤</span>
          <span className="user-name">{user.name}</span>
        </div>
      </div>
    </div>
  );
}

// Router function to render current view
function renderCurrentView(view, setView) {
  switch(view) {
    case 'dashboard':
      return <Dashboard setView={setView} />;
    case 'legal-categories':
      return <LegalCategoriesPage setView={setView} />;
    case 'legal-chat':
      return <LegalChatPage setView={setView} />;
    case 'chat-history':
      return <ChatHistoryPage setView={setView} />;
    case 'cases-dashboard':
      return <CasesDashboard setView={setView} />;
    case 'new-case':
      return <NewCasePage setView={setView} />;
    case 'case-detail':
      return <CaseDetailPage setView={setView} />;
    case 'document-analysis':
      return <DocumentAnalysisPage setView={setView} />;
    case 'document-generator':
      return <DocumentGeneratorPage setView={setView} />;
    default:
      return <Dashboard setView={setView} />;
  }
}

// Dashboard Component
function Dashboard({ setView }) {
  const [stats, setStats] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [recentConversations, setRecentConversations] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('lexai_token');
    
    // Fetch stats
    const statsResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      setStats(statsData);
    }

    // Fetch recent cases
    const casesResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cases`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (casesResponse.ok) {
      const casesData = await casesResponse.json();
      setRecentCases(casesData.cases.slice(0, 5));
    }

    // Fetch recent conversations
    const conversationsResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (conversationsResponse.ok) {
      const conversationsData = await conversationsResponse.json();
      setRecentConversations(conversationsData.conversations.slice(0, 5));
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Bienvenido a LexAI</h2>
        <p>Tu asistente legal inteligente y gestor de casos</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.total_cases}</div>
            <div className="stat-label">Total Casos</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.active_cases}</div>
            <div className="stat-label">Casos Activos</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.total_conversations}</div>
            <div className="stat-label">Consultas IA</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.pending_tasks}</div>
            <div className="stat-label">Tareas Pendientes</div>
          </div>
        </div>
      )}

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <div className="section-header">
            <h3>Accesos Rápidos</h3>
          </div>
          <div className="quick-actions">
            <button 
              className="quick-action-card"
              onClick={() => setView('legal-categories')}
            >
              <div className="quick-action-icon">🤖</div>
              <div className="quick-action-title">Consultar IA Legal</div>
              <div className="quick-action-desc">Haz una consulta al asistente</div>
            </button>
            <button 
              className="quick-action-card"
              onClick={() => setView('new-case')}
            >
              <div className="quick-action-icon">📁</div>
              <div className="quick-action-title">Nuevo Caso</div>
              <div className="quick-action-desc">Registra un caso nuevo</div>
            </button>
            <button 
              className="quick-action-card"
              onClick={() => setView('document-analysis')}
            >
              <div className="quick-action-icon">📄</div>
              <div className="quick-action-title">Analizar Documento</div>
              <div className="quick-action-desc">Sube un documento para análisis</div>
            </button>
            <button 
              className="quick-action-card"
              onClick={() => setView('document-generator')}
            >
              <div className="quick-action-icon">📝</div>
              <div className="quick-action-title">Generar Documento</div>
              <div className="quick-action-desc">Crea documentos legales</div>
            </button>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-section">
            <div className="section-header">
              <h3>Casos Recientes</h3>
              <button onClick={() => setView('cases-dashboard')}>Ver todos</button>
            </div>
            <div className="recent-items">
              {recentCases.map(caso => (
                <div key={caso.id} className="recent-item">
                  <div className="recent-item-main">
                    <div className="recent-item-title">{caso.title}</div>
                    <div className="recent-item-desc">{caso.client_name}</div>
                  </div>
                  <div className={`status-badge ${caso.status}`}>{caso.status}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-section">
            <div className="section-header">
              <h3>Consultas Recientes</h3>
              <button onClick={() => setView('chat-history')}>Ver todas</button>
            </div>
            <div className="recent-items">
              {recentConversations.map(conv => (
                <div key={conv.id} className="recent-item">
                  <div className="recent-item-main">
                    <div className="recent-item-title">
                      {conv.category ? conv.category.charAt(0).toUpperCase() + conv.category.slice(1) : 'General'}
                    </div>
                    <div className="recent-item-desc">
                      {conv.messages && conv.messages[0] ? 
                        conv.messages[0].content.substring(0, 50) + '...' : 
                        'Sin mensajes'
                      }
                    </div>
                  </div>
                  <div className="recent-item-date">
                    {new Date(conv.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Legal Categories Selection Page
function LegalCategoriesPage({ setView }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const token = localStorage.getItem('lexai_token');
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/legal-categories`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      setCategories(data.categories);
    }
  };

  const handleContinue = () => {
    if (selectedCategory) {
      localStorage.setItem('selected_category', selectedCategory);
      setView('legal-chat');
    }
  };

  return (
    <div className="legal-categories-page">
      <div className="page-header">
        <h2>¿Sobre qué tema legal necesitas ayuda?</h2>
        <p>Selecciona una categoría para obtener respuestas más precisas</p>
      </div>

      <div className="categories-grid">
        {categories.map(category => (
          <div 
            key={category.id}
            className={`category-card ${selectedCategory === category.id ? 'selected' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            <div className="category-icon">{category.icon}</div>
            <div className="category-name">{category.name}</div>
            <div className="category-desc">{category.description}</div>
          </div>
        ))}
      </div>

      <div className="page-actions">
        <button 
          className={`continue-button ${selectedCategory ? 'active' : ''}`}
          onClick={handleContinue}
          disabled={!selectedCategory}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

// Legal Chat Page
function LegalChatPage({ setView }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('');

  useEffect(() => {
    const selectedCategory = localStorage.getItem('selected_category');
    setCategory(selectedCategory || '');
    
    // Welcome message
    setMessages([{
      id: 'welcome',
      type: 'ai',
      content: '¡Hola! Soy tu asistente legal inteligente. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    }]);
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('lexai_token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: inputMessage,
          category: category
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage = {
          id: Date.now().toString() + '_ai',
          type: 'ai',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="legal-chat-page">
      <div className="chat-header">
        <button className="back-button" onClick={() => setView('legal-categories')}>
          ← Volver
        </button>
        <h2>Asistente Legal Inteligente</h2>
        {category && (
          <div className="chat-category">
            Categoría: {category.charAt(0).toUpperCase() + category.slice(1)}
          </div>
        )}
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map(message => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-content">{message.content}</div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message ai">
              <div className="message-content">Escribiendo...</div>
            </div>
          )}
        </div>

        <div className="chat-input">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Escribe tu consulta legal..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage} disabled={!inputMessage.trim() || loading}>
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

// Chat History Page
function ChatHistoryPage({ setView }) {
  const [conversations, setConversations] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const token = localStorage.getItem('lexai_token');
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      setConversations(data.conversations);
    }
  };

  const filteredConversations = conversations.filter(conv => 
    filter === 'all' || conv.category === filter
  );

  return (
    <div className="chat-history-page">
      <div className="page-header">
        <h2>Historial de Consultas</h2>
        <p>Revisa tus conversaciones anteriores con el asistente legal</p>
      </div>

      <div className="history-filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todas las categorías</option>
          <option value="familia">Derecho de Familia</option>
          <option value="laboral">Derecho Laboral</option>
          <option value="civil">Derecho Civil</option>
          <option value="penal">Derecho Penal</option>
          <option value="mercantil">Derecho Mercantil</option>
        </select>
      </div>

      <div className="conversations-list">
        {filteredConversations.map(conv => (
          <div key={conv.id} className="conversation-card">
            <div className="conversation-header">
              <div className="conversation-category">
                {conv.category ? conv.category.charAt(0).toUpperCase() + conv.category.slice(1) : 'General'}
              </div>
              <div className="conversation-date">
                {new Date(conv.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="conversation-preview">
              {conv.messages && conv.messages[0] ? 
                conv.messages[0].content.substring(0, 100) + '...' : 
                'Sin mensajes'
              }
            </div>
            <div className="conversation-actions">
              <button>Ver conversación</button>
              <button>Duplicar consulta</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Cases Dashboard
function CasesDashboard({ setView }) {
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    const token = localStorage.getItem('lexai_token');
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cases`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      setCases(data.cases);
    }
  };

  const filteredCases = cases.filter(caso => 
    filter === 'all' || caso.status === filter
  );

  return (
    <div className="cases-dashboard">
      <div className="page-header">
        <h2>Mis Casos Legales</h2>
        <p>Gestiona todos tus casos de manera inteligente</p>
        <button 
          className="primary-button"
          onClick={() => setView('new-case')}
        >
          + Nuevo Caso
        </button>
      </div>

      <div className="cases-filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="activo">Casos Activos</option>
          <option value="cerrado">Casos Cerrados</option>
        </select>
      </div>

      <div className="cases-grid">
        {filteredCases.map(caso => (
          <div key={caso.id} className="case-card">
            <div className="case-header">
              <div className="case-title">{caso.title}</div>
              <div className={`status-badge ${caso.status}`}>
                {caso.status}
              </div>
            </div>
            <div className="case-details">
              <div className="case-client">Cliente: {caso.client_name}</div>
              <div className="case-type">Tipo: {caso.case_type}</div>
              <div className="case-priority">Prioridad: {caso.priority}</div>
            </div>
            <div className="case-description">
              {caso.description}
            </div>
            <div className="case-dates">
              <div>Creado: {new Date(caso.created_at).toLocaleDateString()}</div>
            </div>
            <div className="case-actions">
              <button onClick={() => setView('case-detail')}>Ver Detalle</button>
              <button>Abrir Chat Legal</button>
            </div>
          </div>
        ))}
      </div>

      {filteredCases.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No hay casos</h3>
          <p>Crea tu primer caso para comenzar</p>
          <button 
            className="primary-button"
            onClick={() => setView('new-case')}
          >
            Crear Primer Caso
          </button>
        </div>
      )}
    </div>
  );
}

// New Case Page
function NewCasePage({ setView }) {
  const [formData, setFormData] = useState({
    title: '',
    client_name: '',
    case_type: '',
    description: '',
    priority: 'media'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('lexai_token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setView('cases-dashboard');
      }
    } catch (error) {
      console.error('Error creating case:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-case-page">
      <div className="page-header">
        <button className="back-button" onClick={() => setView('cases-dashboard')}>
          ← Volver a Casos
        </button>
        <h2>Registro de Nuevo Caso</h2>
        <p>Ingresa la información del nuevo caso legal</p>
      </div>

      <form onSubmit={handleSubmit} className="case-form">
        <div className="form-group">
          <label>Título del Caso *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label>Cliente *</label>
          <input
            type="text"
            value={formData.client_name}
            onChange={(e) => setFormData({...formData, client_name: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label>Tipo de Caso *</label>
          <select
            value={formData.case_type}
            onChange={(e) => setFormData({...formData, case_type: e.target.value})}
            required
          >
            <option value="">Seleccionar tipo</option>
            <option value="familia">Derecho de Familia</option>
            <option value="laboral">Derecho Laboral</option>
            <option value="civil">Derecho Civil</option>
            <option value="penal">Derecho Penal</option>
            <option value="mercantil">Derecho Mercantil</option>
            <option value="inmobiliario">Derecho Inmobiliario</option>
          </select>
        </div>

        <div className="form-group">
          <label>Prioridad</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({...formData, priority: e.target.value})}
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </div>

        <div className="form-group">
          <label>Descripción del Caso *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows="4"
            required
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => setView('cases-dashboard')}>
            Cancelar
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Creando...' : 'Crear Caso'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Case Detail Page (placeholder)
function CaseDetailPage({ setView }) {
  return (
    <div className="case-detail-page">
      <div className="page-header">
        <button className="back-button" onClick={() => setView('cases-dashboard')}>
          ← Volver a Casos
        </button>
        <h2>Detalle del Caso</h2>
      </div>
      <div className="content-placeholder">
        <p>Página de detalle del caso en desarrollo...</p>
      </div>
    </div>
  );
}

// Document Analysis Page
function DocumentAnalysisPage({ setView }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    try {
      const token = localStorage.getItem('lexai_token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/documents/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          content: 'Mock content for analysis'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="document-analysis-page">
      <div className="page-header">
        <h2>Análisis de Documentos por IA</h2>
        <p>Sube un documento para obtener análisis automático</p>
      </div>

      <div className="upload-area">
        <div className="dropzone">
          <input
            type="file"
            id="file-upload"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <label htmlFor="file-upload" className="upload-label">
            <div className="upload-icon">📄</div>
            <div className="upload-text">
              <div>Arrastra tu documento aquí</div>
              <div>o haz clic para seleccionar</div>
            </div>
          </label>
        </div>
      </div>

      {loading && (
        <div className="analysis-loading">
          <div className="loading-spinner"></div>
          <p>Analizando documento...</p>
        </div>
      )}

      {analysis && (
        <div className="analysis-results">
          <h3>Resultados del Análisis</h3>
          
          <div className="analysis-section">
            <h4>Resumen</h4>
            <p>{analysis.summary}</p>
          </div>

          <div className="analysis-section">
            <h4>Fechas Importantes</h4>
            <div className="dates-list">
              {analysis.key_dates.map((date, index) => (
                <div key={index} className="date-item">
                  <div className="date-date">{date.date}</div>
                  <div className="date-desc">{date.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="analysis-section">
            <h4>Riesgos Identificados</h4>
            <div className="risks-list">
              {analysis.risks.map((risk, index) => (
                <div key={index} className={`risk-item ${risk.level}`}>
                  <div className="risk-level">{risk.level.toUpperCase()}</div>
                  <div className="risk-desc">{risk.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="analysis-section">
            <h4>Jurisprudencia Relevante</h4>
            <div className="jurisprudence-list">
              {analysis.jurisprudence.map((item, index) => (
                <div key={index} className="jurisprudence-item">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="analysis-section">
            <h4>Cláusulas Destacadas</h4>
            <div className="clauses-list">
              {analysis.clauses.map((clause, index) => (
                <div key={index} className={`clause-item ${clause.type}`}>
                  <div className="clause-type">{clause.type.toUpperCase()}</div>
                  <div className="clause-content">{clause.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Document Generator Page
function DocumentGeneratorPage({ setView }) {
  const [documentType, setDocumentType] = useState('');
  const [formData, setFormData] = useState({});
  const [generatedDocument, setGeneratedDocument] = useState(null);

  const documentTypes = [
    { id: 'contrato_compraventa', name: 'Contrato de Compraventa' },
    { id: 'contrato_alquiler', name: 'Contrato de Alquiler' },
    { id: 'testamento', name: 'Testamento' },
    { id: 'poder_notarial', name: 'Poder Notarial' },
    { id: 'demanda_civil', name: 'Demanda Civil' }
  ];

  const generateDocument = () => {
    // Mock document generation
    setGeneratedDocument({
      title: `${documentTypes.find(d => d.id === documentType)?.name} - Generado`,
      content: `Este es un documento legal generado automáticamente por LexAI.\n\nTipo: ${documentTypes.find(d => d.id === documentType)?.name}\n\nDatos del formulario:\n${JSON.stringify(formData, null, 2)}\n\n[Contenido del documento legal...]`,
      date: new Date().toLocaleDateString()
    });
  };

  return (
    <div className="document-generator-page">
      <div className="page-header">
        <h2>Generador de Documentos Legales</h2>
        <p>Crea documentos legales profesionales con IA</p>
      </div>

      {!generatedDocument ? (
        <div className="generator-form">
          <div className="form-group">
            <label>Tipo de Documento</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              <option value="">Seleccionar tipo</option>
              {documentTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          {documentType && (
            <div className="dynamic-form">
              <h4>Información requerida para {documentTypes.find(d => d.id === documentType)?.name}</h4>
              
              <div className="form-group">
                <label>Parte A (Nombre completo)</label>
                <input
                  type="text"
                  value={formData.parteA || ''}
                  onChange={(e) => setFormData({...formData, parteA: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Parte B (Nombre completo)</label>
                <input
                  type="text"
                  value={formData.parteB || ''}
                  onChange={(e) => setFormData({...formData, parteB: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Importe/Valor</label>
                <input
                  type="text"
                  value={formData.importe || ''}
                  onChange={(e) => setFormData({...formData, importe: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Fecha</label>
                <input
                  type="date"
                  value={formData.fecha || ''}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                />
              </div>

              <button 
                className="generate-button"
                onClick={generateDocument}
                disabled={!documentType}
              >
                Generar Documento
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="document-preview">
          <div className="preview-header">
            <h3>{generatedDocument.title}</h3>
            <div className="preview-actions">
              <button>📥 Descargar PDF</button>
              <button>✏️ Editar</button>
              <button onClick={() => setGeneratedDocument(null)}>🔄 Nuevo Documento</button>
            </div>
          </div>
          
          <div className="document-content">
            <pre>{generatedDocument.content}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;