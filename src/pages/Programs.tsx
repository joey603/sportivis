import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  SharedProgramPreview,
  ShareProgramDialog,
} from '../components/ProgramSharing';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import {
  fetchCloudData,
  fetchIncomingProgramSharesCloud,
  fetchSentProgramSharesCloud,
  respondToProgramShareCloud,
  shareProgramCloud,
} from '../lib/cloud';
import {
  deleteProgram,
  duplicateProgram,
  loadData,
  saveData,
} from '../lib/storage';
import { useAppData } from '../lib/useAppData';
import type { Program, ProgramShare, SentProgramShare } from '../types';

export function Programs() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { t } = useI18n();
  const [data, setData] = useAppData();
  const [shareProgram, setShareProgram] = useState<Program | null>(null);
  const [preview, setPreview] = useState<ProgramShare | null>(null);
  const [busyShareId, setBusyShareId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sentShares, setSentShares] = useState<SentProgramShare[]>([]);
  const [loadingSentShares, setLoadingSentShares] = useState(false);
  const userId = auth.user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let refreshing = false;

    async function refreshIncoming() {
      if (refreshing) return;
      refreshing = true;
      try {
        const shares = await fetchIncomingProgramSharesCloud();
        if (cancelled) return;
        const current = loadData();
        const previousIds = current.incomingProgramShares.map((share) => share.id).join(',');
        const nextIds = shares.map((share) => share.id).join(',');
        if (previousIds !== nextIds) {
          current.incomingProgramShares = shares;
          saveData(current);
          setData(current);
        }
      } catch (reason) {
        if (!cancelled) {
          console.warn('[partage]', reason);
        }
      } finally {
        refreshing = false;
      }
    }

    void refreshIncoming();
    const timer = window.setInterval(refreshIncoming, 15_000);
    window.addEventListener('focus', refreshIncoming);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshIncoming);
    };
  }, [userId, setData]);

  function createNew() {
    navigate('/programmes/nouveau');
  }

  function onDuplicate(id: string) {
    setData(duplicateProgram(id));
  }

  function onDelete(id: string, name: string) {
    if (!confirm(t('programs.deleteConfirm', { name }))) return;
    setData(deleteProgram(id));
  }

  function exerciseCountLabel(count: number) {
    return t(count > 1 ? 'programs.exerciseCount_plural' : 'programs.exerciseCount', {
      count,
    });
  }

  async function sendShare(email: string) {
    if (!shareProgram) return;
    await shareProgramCloud(shareProgram.id, email);
    setSentShares(await fetchSentProgramSharesCloud(shareProgram.id));
  }

  async function openShare(program: Program) {
    setShareProgram(program);
    setSentShares([]);
    setLoadingSentShares(true);
    try {
      setSentShares(await fetchSentProgramSharesCloud(program.id));
    } catch (reason) {
      console.warn('[partages envoyés]', reason);
    } finally {
      setLoadingSentShares(false);
    }
  }

  async function respondToShare(share: ProgramShare, accept: boolean) {
    setBusyShareId(share.id);
    setShareError(null);
    try {
      await respondToProgramShareCloud(share.id, accept);
      const cloud = await fetchCloudData();
      saveData(cloud);
      setData(cloud);
      setPreview(null);
    } catch (reason) {
      setShareError(
        reason instanceof Error
          ? reason.message
          : t('programs.shareRespondError'),
      );
    } finally {
      setBusyShareId(null);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>{t('programs.title')}</h1>
          <p>{t('programs.subtitle')}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={createNew}>
          {t('common.create')}
        </button>
      </header>

      {data.incomingProgramShares.length > 0 && (
        <section className="incoming-programs" aria-labelledby="incoming-programs-title">
          <div className="incoming-programs-heading">
            <div>
              <span className="badge badge-accent">
                {t('programs.pendingCount', {
                  count: data.incomingProgramShares.length,
                })}
              </span>
              <h2 id="incoming-programs-title">{t('programs.incoming')}</h2>
            </div>
            <p className="muted">{t('programs.incomingHint')}</p>
          </div>

          {shareError && <p className="exchange-error">{shareError}</p>}

          {data.incomingProgramShares.map((share) => (
            <div key={share.id} className="panel program-card shared-program-card">
              <span className="shared-program-sender">
                {t('programs.sharedBy', { name: share.senderName })}
              </span>
              <h3>{share.program.name}</h3>
              <p className="meta">
                {exerciseCountLabel(share.program.exercises.length)}
                {share.program.description ? ` · ${share.program.description}` : ''}
              </p>
              <div className="row-actions" style={{ marginTop: '0.85rem' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busyShareId === share.id}
                  onClick={() => void respondToShare(share, true)}
                >
                  {t('common.accept')}
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={busyShareId === share.id}
                  onClick={() => void respondToShare(share, false)}
                >
                  {t('common.reject')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busyShareId === share.id}
                  onClick={() => {
                    setShareError(null);
                    setPreview(share);
                  }}
                >
                  {t('common.view')}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {data.programs.length === 0 && (
        <p className="empty">{t('programs.empty')}</p>
      )}

      {data.programs.map((p) => (
        <div key={p.id} className="panel program-card">
          <h3>{p.name}</h3>
          <p className="meta">
            {exerciseCountLabel(p.exercises.length)}
            {p.description ? ` · ${p.description}` : ''}
          </p>
          <div className="row-actions" style={{ marginTop: '0.85rem' }}>
            <Link to={`/seance/${p.id}`} className="btn btn-primary btn-sm">
              {t('common.launch')}
            </Link>
            <Link to={`/programmes/${p.id}`} className="btn btn-secondary btn-sm">
              {t('common.edit')}
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onDuplicate(p.id)}
            >
              {t('common.duplicate')}
            </button>
            {auth.configured && auth.user && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void openShare(p)}
              >
                {t('common.share')}
              </button>
            )}
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => onDelete(p.id, p.name)}
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      ))}

      {shareProgram && (
        <ShareProgramDialog
          program={shareProgram}
          sentShares={sentShares}
          loadingHistory={loadingSentShares}
          onShare={sendShare}
          onClose={() => setShareProgram(null)}
        />
      )}

      {preview && (
        <SharedProgramPreview
          share={preview}
          busy={busyShareId === preview.id}
          onAccept={() => void respondToShare(preview, true)}
          onReject={() => void respondToShare(preview, false)}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
