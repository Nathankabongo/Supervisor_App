import express from 'express';
import { getDb } from '../services/database.js';
import { enqueueForAllDevices } from '../services/deviceCommandService.js';

const router = express.Router();

let realTimeDataService = null;

export function setCrisisReferences(rt) {
  realTimeDataService = rt;
}

router.get('/status', (req, res) => {
  try {
    const db = getDb();
    const crisis = db.prepare('SELECT * FROM crisis_scenarios ORDER BY id DESC LIMIT 1').get() || {
      status: 'NORMAL', emergency_plan: 'Aucun plan d\'urgence actif', rescue_teams_count: 2, survival_refuges_count: 4, oxygen_hours: 48
    };
    res.json({ crisis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/trigger', (req, res) => {
  try {
    const db = getDb();
    let sirenMessage = 'Ordre PC Crise';
    const action = req.body?.action || 'evacuate';
    const current = db.prepare('SELECT * FROM crisis_scenarios ORDER BY id DESC LIMIT 1').get();

    if (action === 'reset' || action === 'normal') {
      sirenMessage = 'Plan urgence desactive';
      if (current) {
        db.prepare(`UPDATE crisis_scenarios SET status = ?, emergency_plan = ? WHERE id = ?`)
          .run('NORMAL', 'Aucun plan d\'urgence actif', current.id);
      } else {
        db.prepare(`INSERT INTO crisis_scenarios (status, emergency_plan, rescue_teams_count, survival_refuges_count, oxygen_hours) VALUES (?,?,?,?,?)`)
          .run('NORMAL', 'Aucun plan d\'urgence actif', 2, 4, 48);
      }
    } else {
      const plan = action === 'confine'
        ? 'Plan de confinement activé — zones isolées, ventilation en mode urgence'
        : 'Plan d\'évacuation activé — itinéraires optimisés, brigades déployées';
      sirenMessage = plan;
      const status = action === 'confine' ? 'CONFINEMENT' : 'ÉVACUATION';
      if (current) {
        db.prepare(`UPDATE crisis_scenarios SET status = ?, emergency_plan = ?, rescue_teams_count = ? WHERE id = ?`)
          .run(status, plan, Math.max(current.rescue_teams_count || 2, 4), current.id);
      } else {
        db.prepare(`INSERT INTO crisis_scenarios (status, emergency_plan, rescue_teams_count, survival_refuges_count, oxygen_hours) VALUES (?,?,?,?,?)`)
          .run(status, plan, 4, 4, 48);
      }
    }

    const crisis = db.prepare('SELECT * FROM crisis_scenarios ORDER BY id DESC LIMIT 1').get();

    const prefix = `crisis-${action}-${Date.now()}`;
    let alert = null;
    if (action === 'reset' || action === 'normal') {
      const queued = enqueueForAllDevices('DEACTIVATE_SIREN', prefix, sirenMessage, {
        source: 'SYSTEM',
      });
      res.json({
        success: true,
        crisis,
        command: 'DEACTIVATE_SIREN',
        commands: queued,
      });
      return;
    }

    if (action === 'evacuate' && realTimeDataService) {
      alert = realTimeDataService.createSystemAlert({
        zone: 'ZONE B',
        message: sirenMessage,
        type: 'emergency',
      });
    }

    if (action === 'evacuate') {
      const queued = enqueueForAllDevices('ACTIVATE_SIREN', prefix, sirenMessage, {
        alertId: alert?.id || null,
        source: 'SYSTEM',
      });
      if (alert && realTimeDataService) {
        realTimeDataService.emitAlert(alert);
      }
      return res.json({
        success: true,
        crisis,
        alertId: alert?.id || null,
        createdAt: alert?.createdAt || null,
        command: 'ACTIVATE_SIREN',
        commands: queued,
      });
    }

    res.json({ success: true, crisis, alertId: alert?.id || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
