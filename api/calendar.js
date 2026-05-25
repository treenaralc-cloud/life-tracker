import ical from 'node-ical';

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const { url, start, end } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing iCal URL' });
  }

  try {
    const events = await ical.async.fromURL(url);
    const parsedEvents = [];
    
    const startDate = start ? new Date(start) : new Date(0);
    const endDate = end ? new Date(end) : new Date('2100-01-01');

    for (const k in events) {
      if (events.hasOwnProperty(k)) {
        const ev = events[k];
        if (ev.type === 'VEVENT') {
          // Check if event falls within range
          const evStart = new Date(ev.start);
          const evEnd = new Date(ev.end);
          if (evEnd >= startDate && evStart <= endDate) {
            parsedEvents.push({
              title: ev.summary,
              description: ev.description,
              start: ev.start,
              end: ev.end,
              isAllDay: ev.datetype === 'date'
            });
          }
        }
      }
    }
    
    res.status(200).json(parsedEvents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch or parse calendar' });
  }
}
