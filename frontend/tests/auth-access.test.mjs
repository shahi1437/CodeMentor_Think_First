import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canAccessPortal, portalDestination, requiredPortal } from '../src/lib/auth-access.ts';

describe('role access matrix', () => {
  it('lets students use only the student portal', () => {
    assert.equal(canAccessPortal('student', 'student'), true);
    assert.equal(canAccessPortal('student', 'teacher'), false);
    assert.equal(canAccessPortal('student', 'admin'), false);
  });

  it('lets teachers use student and teacher portals but not admin', () => {
    assert.equal(canAccessPortal('teacher', 'student'), true);
    assert.equal(canAccessPortal('teacher', 'teacher'), true);
    assert.equal(canAccessPortal('teacher', 'admin'), false);
  });

  it('lets admins use every portal', () => {
    assert.equal(canAccessPortal('admin', 'student'), true);
    assert.equal(canAccessPortal('admin', 'teacher'), true);
    assert.equal(canAccessPortal('admin', 'admin'), true);
  });
});

describe('required portal detection', () => {
  it('maps student pages, including nested workspaces', () => {
    assert.equal(requiredPortal('/problems'), 'student');
    assert.equal(requiredPortal('/workspace/coding/123'), 'student');
    assert.equal(requiredPortal('/mentor'), 'student');
    assert.equal(requiredPortal('/learning-dna'), 'student');
  });

  it('guards every student-facing area', () => {
    const studentAreas = [
      '/dashboard',
      '/assessment',
      '/problems',
      '/workspace',
      '/analyzer',
      '/mentor',
      '/learning-dna',
      '/daily-plan',
      '/history',
    ];
    for (const area of studentAreas) {
      assert.equal(requiredPortal(area), 'student', area);
    }
  });

  it('maps teacher and admin sections', () => {
    assert.equal(requiredPortal('/teacher'), 'teacher');
    assert.equal(requiredPortal('/admin'), 'admin');
    assert.equal(requiredPortal('/admin/problems/new'), 'admin');
  });

  it('maps nested teacher pages', () => {
    assert.equal(requiredPortal('/teacher/cohorts/42'), 'teacher');
  });

  it('leaves unguarded pages unassigned', () => {
    assert.equal(requiredPortal('/auth/login'), undefined);
    assert.equal(requiredPortal('/adminx'), undefined);
    assert.equal(requiredPortal('/teacherx'), undefined);
    assert.equal(requiredPortal('/dashboardx'), undefined);
  });

  it('treats trailing slashes as the guarded section', () => {
    assert.equal(requiredPortal('/admin/'), 'admin');
    assert.equal(requiredPortal('/teacher/'), 'teacher');
  });
});

describe('portal destinations', () => {
  it('sends each role to its own dashboard by default', () => {
    assert.equal(portalDestination('student'), '/dashboard');
    assert.equal(portalDestination('teacher'), '/teacher');
    assert.equal(portalDestination('admin'), '/admin');
  });

  it('honours permitted requested paths and their query strings', () => {
    assert.equal(portalDestination('admin', '/problems?mode=debugging'), '/problems?mode=debugging');
    assert.equal(portalDestination('teacher', '/mentor'), '/mentor');
    assert.equal(portalDestination('admin', '/teacher'), '/teacher');
  });

  it('keeps permitted deep links unchanged so redirects cannot loop', () => {
    assert.equal(portalDestination('student', '/dashboard'), '/dashboard');
    assert.equal(portalDestination('student', '/problems?mode=normal'), '/problems?mode=normal');
    assert.equal(portalDestination('teacher', '/teacher'), '/teacher');
    assert.equal(portalDestination('admin', '/admin'), '/admin');
  });

  it('falls back to the role dashboard when the requested portal is denied', () => {
    assert.equal(portalDestination('student', '/admin'), '/dashboard');
    assert.equal(portalDestination('teacher', '/admin'), '/teacher');
    assert.equal(portalDestination('student', '/teacher'), '/dashboard');
    assert.equal(portalDestination('student', '/admin/'), '/dashboard');
  });

  it('rejects open-redirect payloads', () => {
    assert.equal(portalDestination('admin', '//evil.example/admin'), '/admin');
    assert.equal(portalDestination('admin', 'https://evil.example/admin'), '/admin');
    assert.equal(portalDestination('admin', '/\\evil.example/admin'), '/admin');
    assert.equal(portalDestination('student', 'javascript:alert(1)'), '/dashboard');
  });
});
