'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { offerValue, premium, classFor } = require('./calc-v8.js');

test('1. F2F plea hearing, 2026-10-14 10:00-11:00, hmcts, Community', () => {
  const start = new Date(2026, 9, 14, 10, 0);
  const end = new Date(2026, 9, 14, 11, 0);
  const result = offerValue({
    delivery: 'F2F',
    appointmentType: 'Crime - Magistrates\' Court | Plea hearing',
    start,
    end,
    hmcts: true,
    security: null,
    bookedHoursBeforeStart: null,
    bankHoliday: false,
    oneWayMiles: 0,
    oneWayMinutes: 0
  });
  assert.equal(result.cls, 'Community');
  assert.equal(result.billableHours, 2);
  assert.equal(result.service, 40.00);
});

test('2. F2F Crown Court Trial, 09:30-16:30 (7 h), Professional', () => {
  const start = new Date(2026, 9, 14, 9, 30);
  const end = new Date(2026, 9, 14, 16, 30);
  const result = offerValue({
    delivery: 'F2F',
    appointmentType: 'Crime - Crown Court | Trial',
    start,
    end,
    hmcts: true,
    security: null,
    bookedHoursBeforeStart: null,
    bankHoliday: false,
    oneWayMiles: 0,
    oneWayMinutes: 0
  });
  assert.equal(result.cls, 'Professional');
  assert.equal(result.billableHours, 6.5);
  assert.equal(result.service, 169.00);
});

test('3. VRI Tribunals - ET | Full hearing, 10:00-11:00, Professional', () => {
  const start = new Date(2026, 9, 14, 10, 0);
  const end = new Date(2026, 9, 14, 11, 0);
  const result = offerValue({
    delivery: 'VRI',
    appointmentType: 'Tribunals - ET | Full hearing',
    start,
    end,
    hmcts: true,
    security: null,
    bookedHoursBeforeStart: null,
    bankHoliday: false,
    oneWayMiles: 0,
    oneWayMinutes: 0
  });
  assert.equal(result.cls, 'Professional');
  assert.equal(result.rate, 24);
  assert.equal(result.service, 24.00);
});

test('4. NPS supervision F2F 09:00-09:30, not hmcts', () => {
  const start = new Date(2026, 9, 14, 9, 0);
  const end = new Date(2026, 9, 14, 9, 30);
  const result = offerValue({
    delivery: 'F2F',
    appointmentType: 'NPS supervision',
    start,
    end,
    hmcts: false,
    security: null,
    bookedHoursBeforeStart: null,
    bankHoliday: false,
    oneWayMiles: 0,
    oneWayMinutes: 0
  });
  assert.equal(result.cls, 'Community');
  assert.equal(result.billableHours, 1);
  assert.equal(result.service, 20.00);
});

test('5. Travel calculations', () => {
  const start = new Date(2026, 9, 14, 10, 0);
  const end = new Date(2026, 9, 14, 11, 0);

  const r1 = offerValue({
    delivery: 'F2F',
    appointmentType: 'Crime - Magistrates\' Court | Plea hearing',
    start,
    end,
    hmcts: true,
    security: null,
    bookedHoursBeforeStart: null,
    bankHoliday: false,
    oneWayMiles: 35.1,
    oneWayMinutes: 90
  });
  assert.equal(r1.travelDistance, 12.04);
  assert.equal(r1.travelTime, 10.00);

  const r2 = offerValue({
    delivery: 'F2F',
    appointmentType: 'Crime - Magistrates\' Court | Plea hearing',
    start,
    end,
    hmcts: true,
    security: null,
    bookedHoursBeforeStart: null,
    bankHoliday: false,
    oneWayMiles: 0,
    oneWayMinutes: 200
  });
  assert.equal(r2.travelTime, 20.00);

  const r3 = offerValue({
    delivery: 'F2F',
    appointmentType: 'Crime - Magistrates\' Court | Plea hearing',
    start,
    end,
    hmcts: true,
    security: null,
    bookedHoursBeforeStart: null,
    bankHoliday: false,
    oneWayMiles: 250,
    oneWayMinutes: 0
  });
  assert.equal(r3.travelDistance, 78.00);
});

test('6. Out of hours: F2F Community Saturday 10:00-12:00 hmcts', () => {
  const start = new Date(2026, 9, 17, 10, 0);
  const end = new Date(2026, 9, 17, 12, 0);
  const result = offerValue({
    delivery: 'F2F',
    appointmentType: 'Crime - Magistrates\' Court | Plea hearing',
    start,
    end,
    hmcts: true,
    security: null,
    bookedHoursBeforeStart: null,
    bankHoliday: false,
    oneWayMiles: 0,
    oneWayMinutes: 0
  });
  assert.equal(result.cls, 'Community');
  assert.equal(result.billableHours, 2);
  assert.equal(result.uplifts.outOfHours, 8.00);
  assert.equal(result.service, 48.00);
});

test('7. Urgency UT1 and UT2 on test 1', () => {
  const start = new Date(2026, 9, 14, 10, 0);
  const end = new Date(2026, 9, 14, 11, 0);
  const baseInput = {
    delivery: 'F2F',
    appointmentType: 'Crime - Magistrates\' Court | Plea hearing',
    start,
    end,
    hmcts: true,
    security: null,
    bankHoliday: false,
    oneWayMiles: 0,
    oneWayMinutes: 0
  };
  const ut1 = offerValue({ ...baseInput, bookedHoursBeforeStart: 2 });
  assert.equal(ut1.uplifts.urgency, 12.00);

  const ut2 = offerValue({ ...baseInput, bookedHoursBeforeStart: 10 });
  assert.equal(ut2.uplifts.urgency, 8.00);
});

test('8. classFor', () => {
  assert.deepEqual(classFor('Family - Children\'s cases Private law | First hearing - FHDRA'), { cls: 'Community', classGuessed: false });
  assert.deepEqual(classFor('Family - Children\'s cases Private law | Further hearing'), { cls: 'Professional', classGuessed: false });
  assert.deepEqual(classFor('Crime - Magistrates\' Court | Preliminary Hearing'), { cls: 'Community', classGuessed: false });
  const unknown = classFor('Something new | Whatever');
  assert.equal(unknown.cls, 'Community');
  assert.equal(unknown.classGuessed, true);
});

test('9. premium', () => {
  assert.equal(premium(55, { total: 40 }), 15);
});
