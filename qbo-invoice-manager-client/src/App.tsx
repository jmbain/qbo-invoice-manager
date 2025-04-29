// /client/src/App.tsx
function App() {
  const handleConnectToQuickBooks = async () => {
    try {
      const res = await fetch('/api/authUri');
      const data = await res.json();
      window.location.href = data.authUrl; // ✅ Redirect user to QuickBooks
    } catch (error) {
      console.error('Error initiating QuickBooks connection', error);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>QBO Invoice Manager</h1>
      <button onClick={handleConnectToQuickBooks}>
        Connect to QuickBooks
      </button>
    </div>
  );
}

export default App;
