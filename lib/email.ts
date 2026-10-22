import { Resend } from 'resend';
import { getAppUrl } from '@/lib/env';
import {
  createFeedbackToken,
  createMoreFeedbackToken,
  createReadToken,
  createSlateFeedbackToken
} from '@/lib/feedback-token';
import type { RecommendationItemView } from '@/lib/types';

function escapeHtml(value: string) {
  return value.replace(/[&<>\"]/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[ch] || ch));
}

function slotLabel(slot: RecommendationItemView['slot_type']) {
  if (slot === 'core') return 'For you';
  if (slot === 'stretch') return 'Go deeper';
  if (slot === 'discovery') return 'Something different';
  return String(slot);
}

function feedbackLink(href: string, label: string) {
  return `<a href="${href}" style="color:#D45124;text-decoration:none;font-size:13px;line-height:20px;font-weight:600;white-space:nowrap;">${label}</a>`;
}

export function renderDailyEmail(items: RecommendationItemView[]) {
  const appUrl = getAppUrl();

  const articleCards = items.map((item) => {
    const base = {
      userId: item.user_id,
      articleId: item.article_id,
      recommendationItemId: item.id,
      recommendationRunId: item.recommendation_run_id,
      surface: 'email' as const
    };

    const read = createReadToken(base);
    const good = createFeedbackToken({ ...base, feedbackType: 'good_pick' });
    const bad = createFeedbackToken({ ...base, feedbackType: 'not_for_me' });
    const save = createFeedbackToken({ ...base, feedbackType: 'save' });
    const more = createMoreFeedbackToken(base);

    const title = escapeHtml(item.article.title);
    const publisher = escapeHtml(item.article.publisher_name);
    const explanation = escapeHtml(
      item.explanation_text || 'Chosen because it matches your current reading profile.'
    );
    const label = escapeHtml(slotLabel(item.slot_type));
    const readingTime = item.article.reading_time_minutes != null
      ? `&nbsp;&middot;&nbsp;${item.article.reading_time_minutes} min read`
      : '';

    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 18px 0;border-collapse:separate;background:#FFFFFF;border:1px solid #DCE1E5;border-radius:16px;">
        <tr>
          <td class="card-pad" style="padding:26px 28px 22px 28px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="padding:0 0 14px 0;">
                  <span style="display:inline-block;padding:5px 9px;border-radius:999px;background:#FFF0E9;color:#D45124;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${label}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:0;">
                  <h2 class="article-title" style="margin:0 0 10px 0;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:31px;font-weight:700;color:#0F2236;letter-spacing:-.01em;">${title}</h2>
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#66717D;">${publisher}${readingTime}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:22px 0 0 0;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                    <tr>
                      <td style="width:3px;background:#E85D2A;border-radius:3px;" width="3">&nbsp;</td>
                      <td style="padding:0 0 0 14px;">
                        <p style="margin:0 0 5px 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:14px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:#D45124;">Why this one</p>
                        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#566370;">${explanation}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 0 0 0;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td bgcolor="#0F2236" style="border-radius:8px;">
                        <a href="${appUrl}/r/${read}" style="display:inline-block;padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">Read article&nbsp;&rarr;</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="feedback-pad" style="padding:13px 28px;background:#FAFBF9;border-top:1px solid #E6EAED;border-radius:0 0 16px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td class="feedback-label" style="padding:0 14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;color:#66717D;white-space:nowrap;">Was this a good pick?</td>
                <td class="feedback-links" align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#A5ADB4;">
                  ${feedbackLink(`${appUrl}/f/${good}`, 'Yes')}
                  <span style="padding:0 7px;color:#A5ADB4;">·</span>
                  ${feedbackLink(`${appUrl}/f/${bad}`, 'No')}
                  <span style="padding:0 7px;color:#A5ADB4;">·</span>
                  ${feedbackLink(`${appUrl}/f/${save}`, 'Save')}
                  <span style="padding:0 7px;color:#A5ADB4;">·</span>
                  ${feedbackLink(`${appUrl}/feedback/more/${more}`, 'More')}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
  }).join('');

  let slateFeedback = '';
  if (items[0]) {
    const first = items[0];
    const great = createSlateFeedbackToken({
      userId: first.user_id,
      recommendationRunId: first.recommendation_run_id,
      feedbackType: 'slate_great',
      surface: 'email'
    });
    const okay = createSlateFeedbackToken({
      userId: first.user_id,
      recommendationRunId: first.recommendation_run_id,
      feedbackType: 'slate_okay',
      surface: 'email'
    });
    const poor = createSlateFeedbackToken({
      userId: first.user_id,
      recommendationRunId: first.recommendation_run_id,
      feedbackType: 'slate_poor',
      surface: 'email'
    });

    slateFeedback = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:28px 0 0 0;border-collapse:separate;background:#FFFFFF;border:1px solid #DCE1E5;border-radius:16px;">
        <tr>
          <td align="center" style="padding:20px 18px;">
            <p style="margin:0 0 12px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:24px;font-weight:700;color:#0F2236;">How was today&rsquo;s selection?</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;">
              ${feedbackLink(`${appUrl}/f/${great}`, 'Great')}
              <span style="padding:0 12px;color:#A5ADB4;">·</span>
              ${feedbackLink(`${appUrl}/f/${okay}`, 'Okay')}
              <span style="padding:0 12px;color:#A5ADB4;">·</span>
              ${feedbackLink(`${appUrl}/f/${poor}`, 'Poor')}
            </p>
          </td>
        </tr>
      </table>`;
  }

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>Atlus: Worth Your Time Today</title>
  <style>
    body { margin: 0 !important; padding: 0 !important; }
    table { border-spacing: 0; }
    img { border: 0; }
    a { text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .outer-pad { padding: 24px 14px !important; }
      .header-pad { padding: 0 2px 22px 2px !important; }
      .card-pad { padding: 22px 20px 19px 20px !important; }
      .feedback-pad { padding: 13px 20px !important; }
      .article-title { font-size: 22px !important; line-height: 28px !important; }
      .feedback-label,
      .feedback-links { display: block !important; width: 100% !important; text-align: left !important; }
      .feedback-label { padding: 0 0 4px 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F5F6F3;color:#0F2236;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">A small set of articles chosen to be worth your time today.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F5F6F3" style="width:100%;background:#F5F6F3;">
    <tr>
      <td class="outer-pad" align="center" style="padding:38px 18px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;">
          <tr>
            <td class="header-pad" style="padding:0 4px 26px 4px;">
              <p style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:28px;font-weight:700;color:#0F2236;">Atl<span style="color:#E85D2A;font-style:italic;font-weight:400;">u</span>s</p>
              <h1 style="margin:0 0 10px 0;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:40px;font-weight:700;letter-spacing:-.02em;color:#0F2236;">Worth your time today.</h1>
              <p style="margin:0;max-width:560px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#66717D;">A small set of recommendations chosen around what you care about, what you want to learn and what might widen your view.</p>
            </td>
          </tr>
          <tr>
            <td>${articleCards}</td>
          </tr>
          <tr>
            <td>${slateFeedback}</td>
          </tr>
          <tr>
            <td align="center" style="padding:26px 10px 8px 10px;">
              <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#7A848E;">Atlus chooses a few articles each day instead of giving you another feed.</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;color:#7A848E;">
                <a href="${appUrl}/today" style="color:#D45124;text-decoration:underline;">Open Atlus</a>
                <span style="padding:0 8px;color:#A5ADB4;">·</span>
                <a href="${appUrl}/settings" style="color:#D45124;text-decoration:underline;">Settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendDailyEmail(to: string, items: RecommendationItemView[]) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: process.env.EMAIL_FROM || 'Atlus <hello@joinatlus.com>',
    to,
    subject: 'Atlus: Worth Your Time Today',
    html: renderDailyEmail(items)
  });
}
