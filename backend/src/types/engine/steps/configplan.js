'use strict';

// NWP-ENGINE-016: logical configuration plan for one plan.
// Pure function. Logical only: settings as {setting, value, source} rows grouped in sections.
// No IP ranges, no VLAN IDs, no CLI, no vendor command syntax (manuscript delimitations).
//
// Consumes: plan (planType, optional topology), requirements.
// Produces: { sections: [{ id, title, rows: [{ setting, value, source }] }] }; a section with no source data is omitted.

const SEGMENT_LABELS = Object.freeze({
  Corporate: 'Corporate',
  Guest: 'Guest',
  Restricted: 'Restricted',
  Voice: 'Voice',
  Cameras_IoT: 'Cameras / IoT',
});

const SEGMENT_REASONS = Object.freeze({
  Corporate: 'Always included as the baseline segment',
  Guest: 'Guest Wi-Fi requested',
  Restricted: 'Sensitive or regulated data handled',
  Voice: 'VoIP phones in use',
  Cameras_IoT: 'IP cameras in use',
});

const row = (setting, value, source) => ({ setting, value, source });

function buildConfigurationPlan(plan, reqs) {
  if (!plan || typeof plan !== 'object') throw new TypeError('plan must be an object.');
  if (!reqs || typeof reqs !== 'object') throw new TypeError('reqs must be an object.');

  const sections = [];

  if (Array.isArray(reqs.vlans) && reqs.vlans.length > 0) {
    sections.push({
      id: 'segmentation',
      title: 'Segmentation',
      rows: reqs.vlans.map((name) =>
        row(
          'Network segment',
          SEGMENT_LABELS[name] ?? String(name).replace(/_/g, ' '),
          SEGMENT_REASONS[name] ?? 'Segmentation requirement'
        )
      ),
    });
  }

  if (typeof reqs.qos === 'boolean') {
    sections.push({
      id: 'qos',
      title: 'Quality of service',
      rows: [
        row(
          'Voice traffic prioritisation (QoS)',
          reqs.qos ? 'Enabled' : 'Not required',
          reqs.qos ? 'VoIP phones in use' : 'No VoIP phones reported'
        ),
      ],
    });
  }

  if (typeof reqs.securityTier === 'string') {
    const advanced = reqs.securityTier === 'advanced';
    const rows = [
      row(
        'Security tier',
        advanced ? 'Advanced' : reqs.securityTier === 'standard' ? 'Standard' : reqs.securityTier,
        advanced ? 'Sensitive or regulated data handled' : 'No sensitive data reported'
      ),
    ];
    if (reqs.throughputMetric === 'idps_throughput' || reqs.throughputMetric === 'routing_throughput') {
      rows.push(
        row(
          'Gateway throughput basis',
          reqs.throughputMetric === 'idps_throughput' ? 'IDS/IPS throughput' : 'Routing throughput',
          'Security tier'
        )
      );
    }
    sections.push({ id: 'security', title: 'Security tier', rows });
  }

  if (typeof reqs.redundancy === 'string') {
    const rows = [];
    const wanNodes = Array.isArray(plan.topology?.nodes)
      ? plan.topology.nodes.filter((node) => node.role === 'wan').length
      : null;

    if (reqs.redundancy === 'none') {
      rows.push(row('Internet link redundancy', 'Single WAN link', 'Downtime tolerance'));
    } else if (reqs.redundancy === 'backupWan' || reqs.redundancy === 'required') {
      const value =
        wanNodes === 1
          ? 'Dual WAN requested; a single WAN is planned because the selected gateway is not confirmed to support it'
          : 'Dual WAN with a backup link';
      rows.push(row('Internet link redundancy', value, 'Downtime tolerance'));
      if (reqs.redundancy === 'required') {
        rows.push(
          row('Core switch redundancy', 'Redundant core switch pair', 'Downtime tolerance: every minute matters')
        );
      }
    } else {
      rows.push(row('Redundancy tier', reqs.redundancy, 'Downtime tolerance'));
    }

    sections.push({ id: 'redundancy', title: 'Redundancy', rows });
  }

  const tunnels = reqs.vpnTunnelsNeeded?.[plan.planType];
  if (Number.isFinite(tunnels)) {
    sections.push({
      id: 'vpn',
      title: 'VPN tunnels',
      rows: [
        row(
          'Site-to-site VPN tunnels',
          tunnels === 0 ? 'Not required' : `${tunnels} site-to-site tunnel${tunnels === 1 ? '' : 's'}`,
          'Number of locations and planned new sites'
        ),
      ],
    });
  }

  if (typeof reqs.backupAdvice === 'string' && reqs.backupAdvice.trim().length > 0) {
    sections.push({
      id: 'backup',
      title: 'Backup connection',
      rows: [row('Backup internet connection', reqs.backupAdvice, 'Connection type and downtime tolerance')],
    });
  }

  return { sections };
}

module.exports = { buildConfigurationPlan };