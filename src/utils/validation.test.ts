import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionStatus,
  normalizeIdentifier,
  validateAnomalyCodeLocal,
  validateStationCodeLocal,
} from './validation';

test('normalizes lowercase and whitespace identifiers', () => {
  assert.equal(normalizeIdentifier(' staec123 '), 'STAEC123');
  assert.equal(validateStationCodeLocal('staec123').valid, true);
  assert.equal(validateAnomalyCodeLocal('a05').valid, true);
});

test('rejects incomplete, extra-length, and malformed station codes', () => {
  assert.equal(validateStationCodeLocal('STAEC12').reasonCode, 'INCOMPLETE');
  assert.equal(validateStationCodeLocal('STAEC1234').reasonCode, 'TOO_LONG');
  assert.equal(validateStationCodeLocal('STA1C123').reasonCode, 'BAD_CHAR_POSITION');
  assert.equal(validateStationCodeLocal('XYZEC123').reasonCode, 'BAD_PREFIX');
});

test('rejects incomplete, extra-length, and malformed anomaly codes', () => {
  assert.equal(validateAnomalyCodeLocal('A1').reasonCode, 'INCOMPLETE');
  assert.equal(validateAnomalyCodeLocal('A001').reasonCode, 'TOO_LONG');
  assert.equal(validateAnomalyCodeLocal('B01').reasonCode, 'BAD_PREFIX');
  assert.equal(validateAnomalyCodeLocal('AAB').reasonCode, 'BAD_CHAR_POSITION');
});

test('enforces valid lifecycle status transitions', () => {
  assert.equal(canTransitionStatus('Pending', 'Assigned'), true);
  assert.equal(canTransitionStatus('Assigned', 'In Progress'), true);
  assert.equal(canTransitionStatus('In Progress', 'Resolved'), true);
  assert.equal(canTransitionStatus('Pending', 'Resolved'), false);
  assert.equal(canTransitionStatus('Assigned', 'Resolved'), false);
  assert.equal(canTransitionStatus('Resolved', 'In Progress'), false);
});
