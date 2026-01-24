import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileChangesService } from '../services/profileChangesService';

const TestProfileChanges: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testProfileChange = async () => {
    if (!user) {
      setResult('No user logged in');
      return;
    }

    setLoading(true);
    try {
      const response = await profileChangesService.submitChangeRequest({
        field_name: 'email',
        new_value: 'test@example.com',
        change_type: 'instructor'
      });
      
      setResult(`Success: ${JSON.stringify(response, null, 2)}`);
    } catch (error: unknown) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Test Profile Changes</h3>
      <p>Current user: {user?.username} ({user?.role})</p>
      <button 
        onClick={testProfileChange} 
        disabled={loading}
        style={{ padding: '10px', margin: '10px' }}
      >
        {loading ? 'Testing...' : 'Test Profile Change Request'}
      </button>
      {result && (
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '10px', 
          marginTop: '10px',
          whiteSpace: 'pre-wrap',
          fontSize: '12px'
        }}>
          {result}
        </pre>
      )}
    </div>
  );
};

export default TestProfileChanges; 