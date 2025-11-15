import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

const PopupManager = () => {
  const [popups, setPopups] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [nextId, setNextId] = useState(1);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    
    // Auto-dismiss après 3 secondes
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const addPopup = (type) => {
    const newPopup = {
      id: nextId,
      type: type,
      title: type === 'modal' ? 'Modal Title' : type === 'dialog' ? 'Dialog Title' : 'Drawer Title',
      content: `This is a ${type} popup with some content.`
    };
    setPopups([...popups, newPopup]);
    setNextId(nextId + 1);
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} ajouté!`, 'success');
  };

  const closePopup = (id) => {
    setPopups(popups.filter(p => p.id !== id));
    showToast('Popup fermé', 'info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Popup Manager</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Ajouter des Popups</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => addPopup('modal')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Ajouter Modal
            </button>
            <button
              onClick={() => addPopup('dialog')}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Ajouter Dialog
            </button>
            <button
              onClick={() => addPopup('drawer')}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Ajouter Drawer
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Tester les Toasts</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => showToast('Opération réussie!', 'success')}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Success Toast
            </button>
            <button
              onClick={() => showToast('Une erreur est survenue', 'error')}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Error Toast
            </button>
            <button
              onClick={() => showToast('Attention à ceci', 'warning')}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Warning Toast
            </button>
            <button
              onClick={() => showToast('Information générale', 'info')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Info Toast
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Popups Actifs ({popups.length})</h2>
          {popups.length === 0 ? (
            <p className="text-gray-500">Aucun popup actif</p>
          ) : (
            <div className="space-y-2">
              {popups.map(popup => (
                <div key={popup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">{popup.type} #{popup.id}</span>
                  <button
                    onClick={() => closePopup(popup.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Fermer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Popups */}
      {popups.map(popup => (
        <div key={popup.id}>
          {popup.type === 'modal' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 animate-[fadeIn_0.2s_ease-out]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">{popup.title}</h3>
                  <button onClick={() => closePopup(popup.id)} className="text-gray-500 hover:text-gray-700">
                    <X size={24} />
                  </button>
                </div>
                <p className="text-gray-600">{popup.content}</p>
              </div>
            </div>
          )}

          {popup.type === 'dialog' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4 animate-[fadeIn_0.2s_ease-out]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">{popup.title}</h3>
                  <button onClick={() => closePopup(popup.id)} className="text-gray-500 hover:text-gray-700">
                    <X size={24} />
                  </button>
                </div>
                <p className="text-gray-600 mb-4">{popup.content}</p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => closePopup(popup.id)}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => closePopup(popup.id)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            </div>
          )}

          {popup.type === 'drawer' && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50">
              <div className="bg-white w-80 h-full shadow-2xl p-6 animate-[slideIn_0.3s_ease-out]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">{popup.title}</h3>
                  <button onClick={() => closePopup(popup.id)} className="text-gray-500 hover:text-gray-700">
                    <X size={24} />
                  </button>
                </div>
                <p className="text-gray-600">{popup.content}</p>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Zone des toasts */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              px-4 py-3 rounded-lg shadow-lg pointer-events-auto
              flex items-center gap-2 min-w-[200px]
              animate-[slideIn_0.3s_ease-out]
              ${toast.type === 'success' ? 'bg-green-500 text-white' : ''}
              ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
              ${toast.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
              ${toast.type === 'info' ? 'bg-blue-500 text-white' : ''}
            `}
          >
            {toast.type === 'success' && <CheckCircle size={20} />}
            {toast.type === 'error' && <XCircle size={20} />}
            {toast.type === 'warning' && <AlertCircle size={20} />}
            {toast.type === 'info' && <Info size={20} />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-auto hover:opacity-80 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default PopupManager;