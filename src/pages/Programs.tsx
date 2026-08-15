import { Link, useNavigate } from 'react-router-dom';
import {
  deleteProgram,
  duplicateProgram,
} from '../lib/storage';
import { useAppData } from '../lib/useAppData';

export function Programs() {
  const navigate = useNavigate();
  const [data, setData] = useAppData();

  function createNew() {
    navigate('/programmes/nouveau');
  }

  function onDuplicate(id: string) {
    setData(duplicateProgram(id));
  }

  function onDelete(id: string, name: string) {
    if (!confirm(`Supprimer « ${name} » ?`)) return;
    setData(deleteProgram(id));
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Programmes</h1>
          <p>Séries, reps, repos — puis lance la séance.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={createNew}>
          Créer
        </button>
      </header>

      {data.programs.length === 0 && (
        <p className="empty">Aucun programme. Crée-en un pour commencer.</p>
      )}

      {data.programs.map((p) => (
        <div key={p.id} className="panel program-card">
          <h3>{p.name}</h3>
          <p className="meta">
            {p.exercises.length} exercice{p.exercises.length > 1 ? 's' : ''}
            {p.description ? ` · ${p.description}` : ''}
          </p>
          <div className="row-actions" style={{ marginTop: '0.85rem' }}>
            <Link to={`/seance/${p.id}`} className="btn btn-primary btn-sm">
              Lancer
            </Link>
            <Link to={`/programmes/${p.id}`} className="btn btn-secondary btn-sm">
              Éditer
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onDuplicate(p.id)}
            >
              Dupliquer
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => onDelete(p.id, p.name)}
            >
              Supprimer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
