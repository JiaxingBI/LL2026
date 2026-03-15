/**
 * Mock data generator for LaborLink development/demo.
 *
 * Produces realistic sample data matching the Dataverse table shapes:
 * - jia_ll_demployees: 60 employees across 4 color-shift teams
 * - jia_ll_dshiftgroups: shift group definitions
 * - jia_ll_dshiftplans: 2-team rotation schedule around March 2026
 * - jia_ll_fattendancereocrds: empty (no prior exceptions)
 *
 * Toggle: set USE_MOCK_DATA = false to revert to live Dataverse.
 */

import type { DataverseData } from './dataverseLoader';
import type { Jia_ll_demployees } from '../generated/models/Jia_ll_demployeesModel';
import type { Jia_ll_dshiftgroups } from '../generated/models/Jia_ll_dshiftgroupsModel';
import type { Jia_ll_dshiftplans } from '../generated/models/Jia_ll_dshiftplansModel';

/** Set to false to revert to live Dataverse calls. */
export const USE_MOCK_DATA = true;

// ── Helpers ──────────────────────────────────────────────────────────────

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Employee names (Chinese factory context) ─────────────────────────────

const NAMES: { name: string; preferred: string; gender: 'M' | 'F' }[] = [
  // Green team (SHF 1) — 15 workers
  { name: '张伟', preferred: 'Zhang Wei', gender: 'M' },
  { name: '李娜', preferred: 'Li Na', gender: 'F' },
  { name: '王强', preferred: 'Wang Qiang', gender: 'M' },
  { name: '刘洋', preferred: 'Liu Yang', gender: 'M' },
  { name: '陈静', preferred: 'Chen Jing', gender: 'F' },
  { name: '赵鑫', preferred: 'Zhao Xin', gender: 'M' },
  { name: '黄敏', preferred: 'Huang Min', gender: 'F' },
  { name: '周波', preferred: 'Zhou Bo', gender: 'M' },
  { name: '吴涛', preferred: 'Wu Tao', gender: 'M' },
  { name: '徐丽', preferred: 'Xu Li', gender: 'F' },
  { name: '孙磊', preferred: 'Sun Lei', gender: 'M' },
  { name: '马芳', preferred: 'Ma Fang', gender: 'F' },
  { name: '朱军', preferred: 'Zhu Jun', gender: 'M' },
  { name: '胡彬', preferred: 'Hu Bin', gender: 'M' },
  { name: '郭云', preferred: 'Guo Yun', gender: 'F' },
  // Orange team (SHF 2) — 15 workers
  { name: '林峰', preferred: 'Lin Feng', gender: 'M' },
  { name: '何丹', preferred: 'He Dan', gender: 'F' },
  { name: '高明', preferred: 'Gao Ming', gender: 'M' },
  { name: '罗杰', preferred: 'Luo Jie', gender: 'M' },
  { name: '梁燕', preferred: 'Liang Yan', gender: 'F' },
  { name: '宋浩', preferred: 'Song Hao', gender: 'M' },
  { name: '郑欢', preferred: 'Zheng Huan', gender: 'F' },
  { name: '谢勇', preferred: 'Xie Yong', gender: 'M' },
  { name: '韩雪', preferred: 'Han Xue', gender: 'F' },
  { name: '唐杰', preferred: 'Tang Jie', gender: 'M' },
  { name: '冯超', preferred: 'Feng Chao', gender: 'M' },
  { name: '董玉', preferred: 'Dong Yu', gender: 'F' },
  { name: '程刚', preferred: 'Cheng Gang', gender: 'M' },
  { name: '曹慧', preferred: 'Cao Hui', gender: 'F' },
  { name: '袁平', preferred: 'Yuan Ping', gender: 'M' },
  // Yellow team (SHF 3) — 15 workers
  { name: '邓辉', preferred: 'Deng Hui', gender: 'M' },
  { name: '于红', preferred: 'Yu Hong', gender: 'F' },
  { name: '任飞', preferred: 'Ren Fei', gender: 'M' },
  { name: '彭亮', preferred: 'Peng Liang', gender: 'M' },
  { name: '卢倩', preferred: 'Lu Qian', gender: 'F' },
  { name: '潘龙', preferred: 'Pan Long', gender: 'M' },
  { name: '蒋圆', preferred: 'Jiang Yuan', gender: 'F' },
  { name: '蔡毅', preferred: 'Cai Yi', gender: 'M' },
  { name: '贾莉', preferred: 'Jia Li', gender: 'F' },
  { name: '闫涛', preferred: 'Yan Tao', gender: 'M' },
  { name: '田文', preferred: 'Tian Wen', gender: 'M' },
  { name: '薛琳', preferred: 'Xue Lin', gender: 'F' },
  { name: '石鹏', preferred: 'Shi Peng', gender: 'M' },
  { name: '范婷', preferred: 'Fan Ting', gender: 'F' },
  { name: '秦晨', preferred: 'Qin Chen', gender: 'M' },
  // Blue team (SHF 4) — 15 workers
  { name: '苗凯', preferred: 'Miao Kai', gender: 'M' },
  { name: '段颖', preferred: 'Duan Ying', gender: 'F' },
  { name: '雷建', preferred: 'Lei Jian', gender: 'M' },
  { name: '侯帅', preferred: 'Hou Shuai', gender: 'M' },
  { name: '钱茜', preferred: 'Qian Xi', gender: 'F' },
  { name: '龚阳', preferred: 'Gong Yang', gender: 'M' },
  { name: '汤蕊', preferred: 'Tang Rui', gender: 'F' },
  { name: '文斌', preferred: 'Wen Bin', gender: 'M' },
  { name: '覃佳', preferred: 'Qin Jia', gender: 'F' },
  { name: '姜伟', preferred: 'Jiang Wei', gender: 'M' },
  { name: '邱鸣', preferred: 'Qiu Ming', gender: 'M' },
  { name: '夏瑶', preferred: 'Xia Yao', gender: 'F' },
  { name: '尹松', preferred: 'Yin Song', gender: 'M' },
  { name: '贺兰', preferred: 'He Lan', gender: 'F' },
  { name: '丁锐', preferred: 'Ding Rui', gender: 'M' },
];

const SHIFT_TEAMS: { workType: string; color: string }[] = [
  { workType: '12H SHF 1', color: 'Green' },
  { workType: '12H SHF 2', color: 'Orange' },
  { workType: '12H SHF 3', color: 'Yellow' },
  { workType: '12H SHF 4', color: 'Blue' },
];

// ── Employees ────────────────────────────────────────────────────────────

function generateEmployees(): Jia_ll_demployees[] {
  const perTeam = 15;
  return NAMES.map((n, i) => {
    const teamIndex = Math.floor(i / perTeam);
    const team = SHIFT_TEAMS[teamIndex];
    const empId = `EMP${String(1001 + i).padStart(5, '0')}`;
    return {
      jia_ll_demployeeid: uuid(),
      jia_empid: empId,
      jia_name: n.name,
      jia_preferredname: n.preferred,
      jia_email: `${n.preferred.toLowerCase().replace(' ', '.')}@lego.com`,
      jia_costcenter: 'CC-Packing',
      jia_organizationalunit: 'Packing',
      jia_worktype: team.workType,
      jia_employeestatus: 'Active',
      statecode: 0 as const,
      statuscode: 1 as const,
      ownerid: '',
      owneridtype: 'systemuser',
      createdbyyominame: '',
      createdonbehalfbyyominame: '',
      modifiedbyyominame: '',
      modifiedonbehalfbyyominame: '',
      owneridname: '',
      owneridyominame: '',
      owningbusinessunitname: '',
    } satisfies Jia_ll_demployees;
  });
}

// ── Shift Groups ─────────────────────────────────────────────────────────

function generateShiftGroups(): Jia_ll_dshiftgroups[] {
  const areas = [834420000, 834420001, 834420002] as const; // Packing, Moulding, Processing
  const departments = ['Dept-A', 'Dept-B'];
  const groups: Jia_ll_dshiftgroups[] = [];

  for (const area of areas) {
    for (const dept of departments) {
      for (const team of SHIFT_TEAMS) {
        groups.push({
          jia_ll_dshiftgroupid: uuid(),
          jia_shift: team.color,
          jia_shiftcn: team.color === 'Green' ? '绿班' : team.color === 'Orange' ? '橙班' : team.color === 'Yellow' ? '黄班' : '蓝班',
          jia_area: area,
          jia_department: dept,
          statecode: 0 as const,
          ownerid: '',
          owneridtype: 'systemuser',
          createdbyyominame: '',
          createdonbehalfbyyominame: '',
          modifiedbyyominame: '',
          modifiedonbehalfbyyominame: '',
          owneridname: '',
          owneridyominame: '',
          owningbusinessunitname: '',
        } satisfies Jia_ll_dshiftgroups);
      }
    }
  }
  return groups;
}

// ── Shift Plans (2-team rotation) ────────────────────────────────────────
//
// Rotation logic (realistic 12-hour factory pattern):
//   Period 1 (4 days): Green Day + Orange Night
//   Period 2 (4 days): Orange Day + Green Night
//   Period 3 (4 days): Yellow Day + Blue Night
//   Period 4 (4 days): Blue Day + Yellow Night
//   ...then repeats (16-day cycle)
//
// This means on any given day, exactly 2 of the 4 teams are working.

function generateShiftPlans(): Jia_ll_dshiftplans[] {
  const plans: Jia_ll_dshiftplans[] = [];
  const year = 2026;

  // Rotation schedule: [dayTeam, nightTeam] per period
  const rotation: [string, string][] = [
    ['Green', 'Orange'],
    ['Orange', 'Green'],
    ['Yellow', 'Blue'],
    ['Blue', 'Yellow'],
  ];

  // Generate plans for the full year
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      // Day of year for rotation calculation
      const dt = new Date(year, month - 1, day);
      const dayOfYear = Math.floor((dt.getTime() - new Date(year, 0, 1).getTime()) / 86400000);
      const periodIndex = Math.floor(dayOfYear / 4) % rotation.length;
      const [dayTeam, nightTeam] = rotation[periodIndex];

      const dateStr = isoDate(year, month, day);

      // Day shift plan
      plans.push({
        jia_ll_dshiftplanid: uuid(),
        jia_date: dateStr,
        jia_daynightshift: 'Day',
        jia_colorshift: dayTeam,
        jia_area: 'Packing',
        jia_department: 'Dept-A',
        statecode: 0 as const,
        ownerid: '',
        owneridtype: 'systemuser',
        createdbyyominame: '',
        createdonbehalfbyyominame: '',
        modifiedbyyominame: '',
        modifiedonbehalfbyyominame: '',
        owneridname: '',
        owneridyominame: '',
        owningbusinessunitname: '',
      } satisfies Jia_ll_dshiftplans);

      // Night shift plan
      plans.push({
        jia_ll_dshiftplanid: uuid(),
        jia_date: dateStr,
        jia_daynightshift: 'Night',
        jia_colorshift: nightTeam,
        jia_area: 'Packing',
        jia_department: 'Dept-A',
        statecode: 0 as const,
        ownerid: '',
        owneridtype: 'systemuser',
        createdbyyominame: '',
        createdonbehalfbyyominame: '',
        modifiedbyyominame: '',
        modifiedonbehalfbyyominame: '',
        owneridname: '',
        owneridyominame: '',
        owningbusinessunitname: '',
      } satisfies Jia_ll_dshiftplans);
    }
  }

  return plans;
}

// ── Public API ────────────────────────────────────────────────────────────

export function generateMockDataverseData(): DataverseData {
  return {
    employees: generateEmployees(),
    shiftGroups: generateShiftGroups(),
    shiftPlans: generateShiftPlans(),
    attendanceRecords: [],
  };
}
