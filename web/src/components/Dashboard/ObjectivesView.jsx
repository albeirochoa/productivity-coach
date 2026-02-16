import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Target,
  TrendingUp,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Info,
  Pencil,
  Trash2,
  BarChart3,
  Save,
} from 'lucide-react';
import { api } from '../../utils/api';
import useAreaCategories from '../../hooks/useAreaCategories';

const DEFAULT_OBJECTIVE = {
  title: '',
  period: '',
  areaId: 'trabajo',
  description: '',
};

const DEFAULT_KR = {
  objectiveId: '',
  title: '',
  targetValue: 100,
  startValue: 0,
  currentValue: 0,
  unit: '',
};

function buildQuarterOptions() {
  const now = new Date();
  const year = now.getFullYear();
  const options = [];
  for (const y of [year, year + 1]) {
    for (const q of [1, 2, 3, 4]) {
      options.push(`${y}-Q${q}`);
    }
  }
  return options;
}

function friendlyApiError(error, fallbackMessage) {
  if (!error?.response) {
    return 'No hay conexion con el backend. Verifica server.js en puerto 3000.';
  }

  const { status, data } = error.response;
  if (status === 404) {
    return 'La API de objetivos no esta disponible. Reinicia backend con los cambios de Fase 7A.';
  }

  if (status === 400 && Array.isArray(data?.details) && data.details.length > 0) {
    const details = data.details.map((d) => `${d.field}: ${d.message}`).join(' | ');
    return `Error de validacion: ${details}`;
  }

  return data?.error || fallbackMessage;
}

function validateObjectiveForm(form) {
  if (!form.title.trim() || form.title.trim().length < 3) {
    return 'El titulo debe tener al menos 3 caracteres.';
  }
  if (!/^\d{4}-Q[1-4]$/.test(form.period.trim())) {
    return 'Periodo invalido. Usa formato YYYY-QN (ej: 2026-Q2).';
  }
  if (!form.areaId) {
    return 'Selecciona un area para el objetivo.';
  }
  return '';
}

function validateKrForm(form) {
  if (!form.objectiveId) {
    return 'Selecciona el objetivo al que pertenece este key result.';
  }
  if (!form.title.trim() || form.title.trim().length < 3) {
    return 'El titulo del key result debe tener al menos 3 caracteres.';
  }

  const start = Number(form.startValue);
  const current = Number(form.currentValue);
  const target = Number(form.targetValue);

  if (!Number.isFinite(start) || !Number.isFinite(current) || !Number.isFinite(target)) {
    return 'Inicio, actual y meta deben ser numeros validos.';
  }
  if (target === start) {
    return 'La meta no puede ser igual al valor inicial.';
  }

  return '';
}

const ObjectivesView = () => {
  const { categories } = useAreaCategories();
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [riskSignals, setRiskSignals] = useState({
    summary: {
      totalKrs: 0,
      riskCount: 0,
      highRiskCount: 0,
      stalledCount: 0,
      noProgressCount: 0,
      behindScheduleCount: 0,
    },
    risks: [],
    focusWeek: [],
  });
  const [loadingRiskSignals, setLoadingRiskSignals] = useState(false);

  const [objectiveForm, setObjectiveForm] = useState(DEFAULT_OBJECTIVE);
  const [krForm, setKrForm] = useState(DEFAULT_KR);

  const [editingObjectiveId, setEditingObjectiveId] = useState(null);
  const [editingKrId, setEditingKrId] = useState(null);

  const [savingObjective, setSavingObjective] = useState(false);
  const [savingKr, setSavingKr] = useState(false);

  const [objectiveValidation, setObjectiveValidation] = useState('');
  const [krValidation, setKrValidation] = useState('');
  const [krRefreshToken, setKrRefreshToken] = useState(0);

  const [progressModal, setProgressModal] = useState({ open: false, kr: null, currentValue: '' });

  const quarterOptions = useMemo(() => buildQuarterOptions(), []);

  const areaOptions = useMemo(() => {
    if (categories.length > 0) return categories;
    return [{ id: 'trabajo', label: 'Trabajo' }, { id: 'personal', label: 'Personal' }];
  }, [categories]);

  useEffect(() => {
    if (!objectiveForm.areaId && areaOptions[0]?.id) {
      setObjectiveForm((prev) => ({ ...prev, areaId: areaOptions[0].id }));
    }
  }, [areaOptions, objectiveForm.areaId]);

  const objectiveOptions = useMemo(
    () => objectives.map((o) => ({ id: o.id, title: o.title })),
    [objectives]
  );

  const resetObjectiveForm = () => {
    setEditingObjectiveId(null);
    setObjectiveForm((prev) => ({
      ...DEFAULT_OBJECTIVE,
      areaId: prev.areaId || areaOptions[0]?.id || 'trabajo',
    }));
    setObjectiveValidation('');
  };

  const resetKrForm = () => {
    setEditingKrId(null);
    setKrForm((prev) => ({ ...DEFAULT_KR, objectiveId: prev.objectiveId || '' }));
    setKrValidation('');
  };

  const loadObjectives = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getObjectives();
      const data = Array.isArray(response.data) ? response.data : [];
      setObjectives(data);
      setError('');
      setApiUnavailable(false);

      setKrForm((prev) => ({
        ...prev,
        objectiveId: prev.objectiveId || data[0]?.id || '',
      }));
    } catch (e) {
      if (e?.response?.status !== 404) {
        console.error('Failed to load objectives:', e);
      }
      const message = friendlyApiError(e, 'No se pudo cargar objetivos');
      setError(message);
      setApiUnavailable(e?.response?.status === 404 || !e?.response);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRiskSignals = useCallback(async () => {
    setLoadingRiskSignals(true);
    try {
      const response = await api.getObjectiveRiskSignals();
      const payload = response.data || {};
      setRiskSignals({
        summary: {
          totalKrs: payload.summary?.totalKrs || 0,
          riskCount: payload.summary?.riskCount || 0,
          highRiskCount: payload.summary?.highRiskCount || 0,
          stalledCount: payload.summary?.stalledCount || 0,
          noProgressCount: payload.summary?.noProgressCount || 0,
          behindScheduleCount: payload.summary?.behindScheduleCount || 0,
        },
        risks: Array.isArray(payload.risks) ? payload.risks : [],
        focusWeek: Array.isArray(payload.focusWeek) ? payload.focusWeek : [],
      });
    } catch (e) {
      setRiskSignals({
        summary: {
          totalKrs: 0,
          riskCount: 0,
          highRiskCount: 0,
          stalledCount: 0,
          noProgressCount: 0,
          behindScheduleCount: 0,
        },
        risks: [],
        focusWeek: [],
      });
    } finally {
      setLoadingRiskSignals(false);
    }
  }, []);

  useEffect(() => {
    loadObjectives();
    loadRiskSignals();
  }, [loadObjectives, loadRiskSignals]);

  const riskByKrId = useMemo(
    () => new Map((riskSignals.risks || []).map((risk) => [risk.id, risk])),
    [riskSignals.risks]
  );

  const handleCreateOrUpdateObjective = async (e) => {
    e.preventDefault();
    setNotice({ type: '', text: '' });

    const validationError = validateObjectiveForm(objectiveForm);
    setObjectiveValidation(validationError);
    if (validationError) return;

    setSavingObjective(true);
    try {
      const payload = {
        title: objectiveForm.title.trim(),
        period: objectiveForm.period.trim(),
        areaId: objectiveForm.areaId,
        description: objectiveForm.description.trim() || undefined,
      };

      if (editingObjectiveId) {
        await api.updateObjective(editingObjectiveId, payload);
        setNotice({ type: 'success', text: 'Objetivo actualizado correctamente.' });
      } else {
        await api.createObjective(payload);
        setNotice({ type: 'success', text: 'Objetivo creado correctamente.' });
      }

      resetObjectiveForm();
      await Promise.all([loadObjectives(), loadRiskSignals()]);
    } catch (e2) {
      const message = friendlyApiError(e2, editingObjectiveId ? 'No se pudo actualizar el objetivo' : 'No se pudo crear el objetivo');
      setObjectiveValidation(message);
      setNotice({ type: 'error', text: message });
    } finally {
      setSavingObjective(false);
    }
  };

  const handleEditObjective = (objective) => {
    setEditingObjectiveId(objective.id);
    setObjectiveForm({
      title: objective.title || '',
      period: objective.period || '',
      areaId: objective.areaId || areaOptions[0]?.id || 'trabajo',
      description: objective.description || '',
    });
    setObjectiveValidation('');
  };

  const handleDeleteObjective = async (objective) => {
    if (!confirm(`Eliminar objetivo "${objective.title}"? Esto borrara tambien sus key results.`)) return;

    try {
      await api.deleteObjective(objective.id);
      if (editingObjectiveId === objective.id) {
        resetObjectiveForm();
      }
      setNotice({ type: 'success', text: 'Objetivo eliminado.' });
      await Promise.all([loadObjectives(), loadRiskSignals()]);
      setKrRefreshToken((t) => t + 1);
    } catch (e) {
      setNotice({ type: 'error', text: friendlyApiError(e, 'No se pudo eliminar el objetivo') });
    }
  };

  const handleCreateOrUpdateKr = async (e) => {
    e.preventDefault();
    setNotice({ type: '', text: '' });

    const validationError = validateKrForm(krForm);
    setKrValidation(validationError);
    if (validationError) return;

    setSavingKr(true);
    try {
      const payload = {
        objectiveId: krForm.objectiveId,
        title: krForm.title.trim(),
        targetValue: Number(krForm.targetValue),
        startValue: Number(krForm.startValue),
        currentValue: Number(krForm.currentValue),
        unit: krForm.unit.trim() || undefined,
      };

      if (editingKrId) {
        await api.updateKeyResult(editingKrId, payload);
        setNotice({ type: 'success', text: 'Key result actualizado.' });
      } else {
        await api.createKeyResult(payload);
        setNotice({ type: 'success', text: 'Key result creado correctamente.' });
      }

      resetKrForm();
      await Promise.all([loadObjectives(), loadRiskSignals()]);
      setKrRefreshToken((t) => t + 1);
    } catch (e2) {
      const message = friendlyApiError(e2, editingKrId ? 'No se pudo actualizar el key result' : 'No se pudo crear el key result');
      setKrValidation(message);
      setNotice({ type: 'error', text: message });
    } finally {
      setSavingKr(false);
    }
  };

  const handleEditKr = (kr) => {
    setEditingKrId(kr.id);
    setKrForm({
      objectiveId: kr.objectiveId,
      title: kr.title || '',
      targetValue: kr.targetValue ?? 100,
      startValue: kr.startValue ?? 0,
      currentValue: kr.currentValue ?? 0,
      unit: kr.unit || '',
    });
    setKrValidation('');
  };

  const handleDeleteKr = async (kr) => {
    if (!confirm(`Eliminar key result "${kr.title}"?`)) return;
    try {
      await api.deleteKeyResult(kr.id);
      if (editingKrId === kr.id) resetKrForm();
      setNotice({ type: 'success', text: 'Key result eliminado.' });
      setKrRefreshToken((t) => t + 1);
      await Promise.all([loadObjectives(), loadRiskSignals()]);
    } catch (e) {
      setNotice({ type: 'error', text: friendlyApiError(e, 'No se pudo eliminar el key result') });
    }
  };

  const openProgressModal = (kr) => {
    setProgressModal({ open: true, kr, currentValue: `${kr.currentValue}` });
  };

  const saveProgress = async () => {
    if (!progressModal.kr) return;
    const next = Number(progressModal.currentValue);
    if (!Number.isFinite(next)) {
      setNotice({ type: 'error', text: 'El progreso debe ser un numero valido.' });
      return;
    }

    try {
      await api.updateKeyResultProgress(progressModal.kr.id, next);
      setNotice({ type: 'success', text: 'Progreso actualizado.' });
      setProgressModal({ open: false, kr: null, currentValue: '' });
      setKrRefreshToken((t) => t + 1);
      await Promise.all([loadObjectives(), loadRiskSignals()]);
    } catch (e) {
      setNotice({ type: 'error', text: friendlyApiError(e, 'No se pudo actualizar progreso') });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="objectives-view">
      {apiUnavailable && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200 flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5" />
          <div>
            <p className="font-medium">API de objetivos no disponible</p>
            <p className="text-yellow-100/80">Reinicia el backend para cargar las rutas de Fase 7A y vuelve a intentar.</p>
            <p className="text-yellow-100/70 mt-1">
              Ejecuta: <code className="bg-black/30 px-1 rounded">cd web</code> + <code className="bg-black/30 px-1 rounded">node server.js</code>
            </p>
          </div>
        </div>
      )}

      {notice.text && (
        <div
          className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
            notice.type === 'success'
              ? 'border border-green-500/40 bg-green-500/10 text-green-200'
              : 'border border-red-500/40 bg-red-500/10 text-red-200'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="glass rounded-2xl p-5 border border-white/10" data-testid="objective-risk-dashboard">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-300" />
            Dashboard estrategico
          </h3>
          {loadingRiskSignals && <span className="text-xs text-gray-400">Actualizando senales...</span>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-black/20 rounded-xl p-3">
            <p className="text-xs text-gray-400">KR totales</p>
            <p className="text-xl font-semibold">{riskSignals.summary.totalKrs}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-xs text-red-200/80">KR en riesgo</p>
            <p className="text-xl font-semibold text-red-200">{riskSignals.summary.riskCount}</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <p className="text-xs text-amber-200/80">Sin avance (7d+)</p>
            <p className="text-xl font-semibold text-amber-200">{riskSignals.summary.noProgressCount}</p>
          </div>
          <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl p-3">
            <p className="text-xs text-fuchsia-200/80">Desvio de plan</p>
            <p className="text-xl font-semibold text-fuchsia-200">{riskSignals.summary.behindScheduleCount}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Foco semanal sugerido</p>
          {riskSignals.focusWeek.length === 0 ? (
            <p className="text-xs text-gray-400">No hay KRs criticos por ahora.</p>
          ) : (
            <div className="space-y-2">
              {riskSignals.focusWeek.map((riskItem) => (
                <div key={riskItem.id} className="bg-black/20 rounded-lg px-3 py-2">
                  <p className="text-sm">{riskItem.title}</p>
                  <p className="text-xs text-gray-400">{riskItem.objectiveTitle} · {riskItem.progress}%</p>
                  <p className="text-xs text-amber-200 mt-1">
                    {(riskItem.risk?.reasons?.[0]?.label) || 'Revisar este KR esta semana'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form
          onSubmit={handleCreateOrUpdateObjective}
          className="glass rounded-2xl p-5 space-y-3 border border-white/10"
          data-testid="objective-create-form"
        >
          <h3 className="font-semibold flex items-center gap-2">
            {editingObjectiveId ? <Pencil size={18} className="text-purple-300" /> : <Target size={18} className="text-purple-300" />}
            {editingObjectiveId ? 'Editar objetivo' : 'Nuevo objetivo'}
          </h3>
          <p className="text-xs text-gray-400 flex items-start gap-2">
            <Info size={14} className="mt-0.5" />
            Objetivo = resultado que quieres lograr. Periodo = trimestre donde esperas cumplirlo.
          </p>

          <div className="space-y-1">
            <label className="text-xs text-gray-300">Titulo del objetivo (requerido)</label>
            <input
              value={objectiveForm.title}
              onChange={(e) => {
                setObjectiveForm((p) => ({ ...p, title: e.target.value }));
                if (objectiveValidation) setObjectiveValidation('');
              }}
              placeholder="Ej: Preparar media maraton Bogota"
              className="w-full bg-white/5 rounded-lg p-2.5 text-sm"
              data-testid="objective-title-input"
              disabled={apiUnavailable}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-300">Periodo objetivo (requerido)</label>
              <select
                value={objectiveForm.period}
                onChange={(e) => {
                  setObjectiveForm((p) => ({ ...p, period: e.target.value }));
                  if (objectiveValidation) setObjectiveValidation('');
                }}
                className="w-full bg-white/5 rounded-lg p-2.5 text-sm"
                data-testid="objective-period-input"
                disabled={apiUnavailable}
              >
                <option value="">Selecciona periodo</option>
                {quarterOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-300">Area (requerido)</label>
              <select
                value={objectiveForm.areaId}
                onChange={(e) => {
                  setObjectiveForm((p) => ({ ...p, areaId: e.target.value }));
                  if (objectiveValidation) setObjectiveValidation('');
                }}
                className="w-full bg-white/5 rounded-lg p-2.5 text-sm"
                data-testid="objective-area-select"
                disabled={apiUnavailable}
              >
                {areaOptions.map((area) => (
                  <option key={area.id} value={area.id}>{area.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-300">Descripcion (opcional)</label>
            <textarea
              value={objectiveForm.description}
              onChange={(e) => setObjectiveForm((p) => ({ ...p, description: e.target.value }))}
              rows="2"
              placeholder="Que resultado quieres conseguir este trimestre"
              className="w-full bg-white/5 rounded-lg p-2.5 text-sm"
              disabled={apiUnavailable}
            />
          </div>

          {objectiveValidation && (
            <p className="text-xs text-red-300" data-testid="objective-validation-error">{objectiveValidation}</p>
          )}

          <div className="flex gap-2">
            <button
              disabled={apiUnavailable || savingObjective}
              className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded-lg p-2.5 text-sm font-medium"
              data-testid="objective-create-btn"
            >
              {savingObjective ? 'Guardando...' : editingObjectiveId ? 'Guardar cambios' : 'Crear objetivo'}
            </button>
            {editingObjectiveId && (
              <button
                type="button"
                onClick={resetObjectiveForm}
                className="px-4 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <form
          onSubmit={handleCreateOrUpdateKr}
          className="glass rounded-2xl p-5 space-y-3 border border-white/10"
          data-testid="kr-create-form"
        >
          <h3 className="font-semibold flex items-center gap-2">
            {editingKrId ? <Pencil size={18} className="text-cyan-300" /> : <Plus size={18} className="text-cyan-300" />}
            {editingKrId ? 'Editar key result' : 'Nuevo key result'}
          </h3>
          <p className="text-xs text-gray-400 flex items-start gap-2">
            <Info size={14} className="mt-0.5" />
            KR = metrica numerica de avance del objetivo (inicio, actual y meta).
          </p>

          <div className="space-y-1">
            <label className="text-xs text-gray-300">Objetivo (requerido)</label>
            <select
              value={krForm.objectiveId}
              onChange={(e) => {
                setKrForm((p) => ({ ...p, objectiveId: e.target.value }));
                if (krValidation) setKrValidation('');
              }}
              className="w-full bg-white/5 rounded-lg p-2.5 text-sm"
              data-testid="kr-objective-select"
              disabled={apiUnavailable}
            >
              <option value="">Selecciona objetivo</option>
              {objectiveOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-300">Titulo del KR (requerido)</label>
            <input
              value={krForm.title}
              onChange={(e) => {
                setKrForm((p) => ({ ...p, title: e.target.value }));
                if (krValidation) setKrValidation('');
              }}
              placeholder="Ej: Correr 21 km en menos de 2 horas"
              className="w-full bg-white/5 rounded-lg p-2.5 text-sm"
              data-testid="kr-title-input"
              disabled={apiUnavailable}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-300">Inicio</label>
              <input
                type="number"
                value={krForm.startValue}
                onChange={(e) => {
                  setKrForm((p) => ({ ...p, startValue: e.target.value }));
                  if (krValidation) setKrValidation('');
                }}
                className="bg-white/5 rounded-lg p-2.5 text-sm w-full"
                placeholder="0"
                disabled={apiUnavailable}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-300">Actual</label>
              <input
                type="number"
                value={krForm.currentValue}
                onChange={(e) => {
                  setKrForm((p) => ({ ...p, currentValue: e.target.value }));
                  if (krValidation) setKrValidation('');
                }}
                className="bg-white/5 rounded-lg p-2.5 text-sm w-full"
                placeholder="0"
                disabled={apiUnavailable}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-300">Meta</label>
              <input
                type="number"
                value={krForm.targetValue}
                onChange={(e) => {
                  setKrForm((p) => ({ ...p, targetValue: e.target.value }));
                  if (krValidation) setKrValidation('');
                }}
                className="bg-white/5 rounded-lg p-2.5 text-sm w-full"
                placeholder="100"
                disabled={apiUnavailable}
              />
            </div>
          </div>

          {krValidation && (
            <p className="text-xs text-red-300" data-testid="kr-validation-error">{krValidation}</p>
          )}

          <div className="flex gap-2">
            <button
              disabled={apiUnavailable || savingKr}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 rounded-lg p-2.5 text-sm font-medium"
              data-testid="kr-create-btn"
            >
              {savingKr ? 'Guardando...' : editingKrId ? 'Guardar cambios KR' : 'Crear key result'}
            </button>
            {editingKrId && (
              <button
                type="button"
                onClick={resetKrForm}
                className="px-4 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="glass rounded-2xl p-5 border border-white/10">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-green-300" />
          Objetivos activos
        </h3>
        {loading && <p className="text-sm text-gray-400">Cargando...</p>}
        {!loading && error && <p className="text-sm text-red-300">{error}</p>}
        {!loading && !error && objectives.length === 0 && (
          <p className="text-sm text-gray-400">Aun no hay objetivos.</p>
        )}
        <div className="space-y-3" data-testid="objectives-list">
          {objectives.map((objective) => (
            <div
              key={objective.id}
              className="bg-white/5 rounded-xl p-4"
              data-testid="objective-card"
              data-objective-id={objective.id}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium" data-testid="objective-title">{objective.title}</p>
                  <p className="text-xs text-gray-400">{objective.period} · {objective.areaId || 'sin area'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-300">{objective.progress || 0}%</span>
                  <button
                    type="button"
                    onClick={() => handleEditObjective(objective)}
                    className="p-1.5 rounded bg-white/10 hover:bg-white/20"
                    title="Editar objetivo"
                    data-testid="objective-edit-btn"
                    data-objective-id={objective.id}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteObjective(objective)}
                    className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300"
                    title="Eliminar objetivo"
                    data-testid="objective-delete-btn"
                    data-objective-id={objective.id}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <ObjectiveKrs
                objectiveId={objective.id}
                refreshToken={krRefreshToken}
                onEditKr={handleEditKr}
                onDeleteKr={handleDeleteKr}
                onUpdateProgress={openProgressModal}
                riskByKrId={riskByKrId}
              />
            </div>
          ))}
        </div>
      </div>

      {progressModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0e27] border border-white/10 rounded-2xl p-5 w-full max-w-md space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <BarChart3 size={16} className="text-cyan-300" />
              Actualizar progreso KR
            </h4>
            <p className="text-sm text-gray-400">{progressModal.kr?.title}</p>
            <input
              type="number"
              value={progressModal.currentValue}
              onChange={(e) => setProgressModal((prev) => ({ ...prev, currentValue: e.target.value }))}
              className="w-full bg-white/5 rounded-lg p-2.5 text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setProgressModal({ open: false, kr: null, currentValue: '' })}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveProgress}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 font-medium inline-flex items-center gap-2"
              >
                <Save size={14} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ObjectiveKrs = ({ objectiveId, refreshToken, onEditKr, onDeleteKr, onUpdateProgress, riskByKrId }) => {
  const [krs, setKrs] = useState([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await api.getKeyResults({ objectiveId });
        if (active) setKrs(Array.isArray(response.data) ? response.data : []);
      } catch {
        if (active) setKrs([]);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [objectiveId, refreshToken]);

  if (!krs.length) {
    return <p className="text-xs text-gray-500 mt-2">Sin key results.</p>;
  }

  return (
    <div className="mt-3 space-y-2">
      {krs.map((kr) => {
        const risk = riskByKrId?.get(kr.id);
        const riskLevel = risk?.risk?.level || 'low';
        const riskTone =
          riskLevel === 'high'
            ? 'border border-red-500/30 bg-red-500/10'
            : riskLevel === 'medium'
            ? 'border border-amber-500/30 bg-amber-500/10'
            : 'bg-black/20';
        const riskLabel =
          riskLevel === 'high'
            ? 'Riesgo alto'
            : riskLevel === 'medium'
            ? 'Riesgo medio'
            : null;

        return (
        <div
          key={kr.id}
          className={`w-full text-left rounded-lg p-2.5 ${riskTone}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm">{kr.title}</p>
              <p className="text-xs text-gray-400">
                {kr.currentValue} / {kr.targetValue} ({kr.progress}%)
              </p>
              {riskLabel && (
                <p className={`text-xs mt-1 ${riskLevel === 'high' ? 'text-red-200' : 'text-amber-200'}`}>
                  {riskLabel}: {risk.risk?.reasons?.[0]?.label || 'requiere atencion esta semana'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdateProgress(kr)}
                className="p-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200"
                title="Actualizar progreso"
              >
                <BarChart3 size={12} />
              </button>
              <button
                type="button"
                onClick={() => onEditKr(kr)}
                className="p-1.5 rounded bg-white/10 hover:bg-white/20"
                title="Editar KR"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={() => onDeleteKr(kr)}
                className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300"
                title="Eliminar KR"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
};

export default ObjectivesView;
