import { ProjectTeamMember } from '@/types/team.types';

export interface MatchScoreResult {
  member: ProjectTeamMember;
  score: number;
  matchReason: string;
}

/**
 * Finds the best matching ProjectTeamMember based on task department, title, or role keywords.
 */
export function findMatchingTeamMember(
  taskSubject: string = '',
  taskDepartment: string = '',
  teamMembers: ProjectTeamMember[] = []
): MatchScoreResult | null {
  if (!teamMembers || teamMembers.length === 0) return null;

  const subjectLower = taskSubject.toLowerCase();
  const deptLower = taskDepartment.toLowerCase();

  let bestMatch: MatchScoreResult | null = null;
  let highestScore = 0;

  for (const member of teamMembers) {
    if (member.status !== 'Active') continue;

    let score = 0;
    const matchReasons: string[] = [];

    const memberDept = (member.department || '').toLowerCase();
    const memberRole = (member.role || '').toLowerCase();
    const memberFunc = (member.function_name || '').toLowerCase();

    // 1. Department match (+30 points)
    if (deptLower && memberDept && (memberDept.includes(deptLower) || deptLower.includes(memberDept))) {
      score += 30;
      matchReasons.push(`Department match (${member.department})`);
    }

    // 2. Role / Function keyword matches (+20 points each)
    const keywords = [
      'battery',
      'cad',
      'chassis',
      'quality',
      'validation',
      'powertrain',
      'software',
      'hardware',
      'thermal',
      'simulation',
      'lead',
      'architect',
      'compliance',
      'apqp',
    ];

    for (const kw of keywords) {
      if (subjectLower.includes(kw)) {
        if (memberRole.includes(kw) || memberFunc.includes(kw)) {
          score += 25;
          matchReasons.push(`Skill/Keyword match ("${kw}")`);
        }
      }
    }

    // 3. Board member / Lead tie-breaker (+5 points)
    if (member.is_board_member || memberRole.includes('lead') || memberRole.includes('chief')) {
      score += 5;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = {
        member,
        score,
        matchReason: matchReasons.join(', ') || `Role alignment (${member.role})`,
      };
    }
  }

  // Fallback to first active member if no specific keyword matched
  if (!bestMatch) {
    const fallbackMember = teamMembers.find((m) => m.status === 'Active') || teamMembers[0];
    return {
      member: fallbackMember,
      score: 10,
      matchReason: `Default team assignment (${fallbackMember.role})`,
    };
  }

  return bestMatch;
}
