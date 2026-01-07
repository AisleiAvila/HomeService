await import('../api/technical-reports/[reportId].js');
await import('../api/technical-reports/[reportId]/client-link.js');
await import('../api/technical-reports/[reportId]/request-otp.js');
await import('../api/technical-reports/[reportId]/verify-otp.js');
await import('../api/technical-reports/[reportId]/submit-signature.js');

console.log('ok');
