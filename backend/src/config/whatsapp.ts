/**
 * WhatsApp Cloud API helper using Meta's Graph API for order status alerts.
 * (No mocks, directly executes the HTTPS request).
 */

const phone_id = process.env.WHATSAPP_PHONE_NUMBER_ID;
const access_token = process.env.WHATSAPP_ACCESS_TOKEN;

if (!phone_id || !access_token) {
  console.warn('⚠️ WARNING: WhatsApp Cloud API keys are missing in your environment config (.env). Alerts will output to console logs.');
}

/**
 * Fire template notification message via Meta Graph API
 */
export const sendWhatsAppAlert = async (
  toPhone: string,
  templateName: string,
  parameters: string[]
): Promise<boolean> => {
  try {
    if (!phone_id || !access_token) {
      console.log(`[WhatsApp Simulated Log] To: ${toPhone}, Template: ${templateName}, Params: ${JSON.stringify(parameters)}`);
      return true;
    }

    // Format phone number to E.164 format (prepending 91 for India if not present)
    let formattedPhone = toPhone.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }

    const url = `https://graph.facebook.com/v18.0/${phone_id}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_US',
        },
        components: [
          {
            type: 'body',
            parameters: parameters.map((param) => ({
              type: 'text',
              text: param,
            })),
          },
        ],
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✓ WhatsApp Alert Sent successfully to ${formattedPhone}`);
      return true;
    } else {
      console.error('❌ WhatsApp Cloud API error:', data);
      return false;
    }
  } catch (error) {
    console.error('Error sending WhatsApp Cloud API request:', error);
    return false;
  }
};
