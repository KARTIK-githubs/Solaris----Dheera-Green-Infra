import { app } from './index';
import { ensureDbConnected } from './config/db';

const port = Number(process.env.PORT || 5000);
if (!(await ensureDbConnected())) {
  console.warn('[Solaris API] Database unavailable. Database-backed requests will retry the connection.');
}
app.listen(port, () => console.log(`Solaris API listening on port ${port}`));
