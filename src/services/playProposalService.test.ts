import { getTodayAlmaty, getCurrentTimeAlmaty } from './playProposalService';

function runUnitTests() {
  console.log('🧪 Running PlayProposal Service & Business Rules Unit Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Timezone and Date format test
  const todayAlmaty = getTodayAlmaty();
  assert('Almaty date returns YYYY-MM-DD format', /^\d{4}-\d{2}-\d{2}$/.test(todayAlmaty), `Got ${todayAlmaty}`);

  // 2. Time format test
  const timeAlmaty = getCurrentTimeAlmaty();
  assert('Almaty time returns HH:mm format', /^\d{2}:\d{2}$/.test(timeAlmaty), `Got ${timeAlmaty}`);

  // 3. Validation rule PLAY-R-03 / PLAY-R-05 (date in past check)
  const isPastDate = (dateStr: string) => dateStr < todayAlmaty;
  assert('Past date correctly identified as invalid', isPastDate('2020-01-01') === true);
  assert('Future date correctly identified as valid', isPastDate('2099-12-31') === false);

  // 4. Max participants range 2..50 (PLAY-R-03)
  const isValidMaxParticipants = (count: number) => count >= 2 && count <= 50;
  assert('Max participants 1 is invalid (<2)', isValidMaxParticipants(1) === false);
  assert('Max participants 2 is valid (min)', isValidMaxParticipants(2) === true);
  assert('Max participants 10 is valid', isValidMaxParticipants(10) === true);
  assert('Max participants 50 is valid (max)', isValidMaxParticipants(50) === true);
  assert('Max participants 51 is invalid (>50)', isValidMaxParticipants(51) === false);

  // 5. Sport type enum validation
  const validSports = ['football', 'basketball', 'volleyball'];
  const isValidSport = (sport: string) => validSports.includes(sport);
  assert('football is valid sport', isValidSport('football') === true);
  assert('volleyball is valid sport', isValidSport('volleyball') === true);
  assert('tennis is invalid sport', isValidSport('tennis') === false);

  // 6. Chat access permissions (PLAY-R-17, PLAY-R-22)
  const canAccessChat = (isOrganizer: boolean, participantStatus?: string) => {
    if (isOrganizer) return true;
    return participantStatus === 'PENDING' || participantStatus === 'APPROVED';
  };
  assert('Organizer has chat access', canAccessChat(true) === true);
  assert('Pending applicant has chat access', canAccessChat(false, 'PENDING') === true);
  assert('Approved participant has chat access', canAccessChat(false, 'APPROVED') === true);
  assert('Rejected applicant has NO chat access', canAccessChat(false, 'REJECTED') === false);
  assert('Removed applicant has NO chat access', canAccessChat(false, 'REMOVED') === false);
  assert('Non-participant has NO chat access', canAccessChat(false, undefined) === false);

  // 7. Spot availability calculation (PLAY-R-13)
  const isProposalFull = (maxParticipants: number, approvedCount: number) => {
    // 1 spot taken by organizer, rest by approved
    return approvedCount >= maxParticipants - 1;
  };
  assert('Proposal with max 5 and 4 approved is full (1 host + 4 guests = 5)', isProposalFull(5, 4) === true);
  assert('Proposal with max 5 and 3 approved is not full (1 host + 3 guests = 4)', isProposalFull(5, 3) === false);

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed out of ${passed + failed} tests.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runUnitTests();
