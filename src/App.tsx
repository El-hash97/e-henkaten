import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { InputForm } from './components/InputForm';
import { RekapData } from './components/RekapData';
import { clsx } from 'clsx';
import { Toaster } from 'react-hot-toast';

type Tab = 'input' | 'rekap';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('input');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  
  const fetchRecords = useStore((state) => state.fetchRecords);
  
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleEdit = (id: string) => {
    setEditingRecordId(id);
    setActiveTab('input');
  };

  const handleSave = () => {
    setEditingRecordId(null);
    setActiveTab('rekap');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <Toaster position="top-right" />
      <Navbar />
      
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('input')}
            className={clsx(
              "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
              activeTab === 'input' 
                ? "bg-navy-900 text-white shadow-md shadow-navy-900/20" 
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            Input Form
          </button>
          <button
            onClick={() => setActiveTab('rekap')}
            className={clsx(
              "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
              activeTab === 'rekap' 
                ? "bg-navy-900 text-white shadow-md shadow-navy-900/20" 
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            Rekap Data
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 min-h-[600px] animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'input' && <InputForm onSave={handleSave} editingRecordId={editingRecordId} />}
          {activeTab === 'rekap' && <RekapData onEdit={handleEdit} />}
        </div>
        
      </main>

      <Footer />
    </div>
  );
}

export default App;
