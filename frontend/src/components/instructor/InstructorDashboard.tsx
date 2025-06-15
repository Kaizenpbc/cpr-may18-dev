const fetchDashboardData = async () => {
  try {
    const [statsResponse, summaryResponse] = await Promise.all([
      api.get(`/admin/instructor-stats?month=${currentMonth}`),
      api.get(`/admin/dashboard-summary?month=${currentMonth}`)
    ]);
    setStats(statsResponse.data);
    setSummary(summaryResponse.data);
  } catch (error) {
    console.error('Dashboard fetch error:', error);
  }
}; 