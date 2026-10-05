import dotenv from 'dotenv';
dotenv.config();

const botToken = process.env.Bot_User_OAuth_Token;

if (!botToken) {
  console.error("No Bot_User_OAuth_Token found in .env");
  process.exit(1);
}

async function runSmokeTest() {
  console.log("1. Fetching channels...");
  const channelsRes = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel', {
    headers: { 'Authorization': `Bearer ${botToken}` }
  });
  
  const channelsData = await channelsRes.json();
  if (!channelsData.ok) {
    console.error("Failed to fetch channels:", channelsData.error);
    process.exit(1);
  }
  
  const channels = channelsData.channels;
  if (channels.length === 0) {
    console.error("No channels found. Cannot send smoke test message.");
    process.exit(1);
  }
  
  // Find 'general' or pick the first one
  const targetChannel = channels.find(c => c.name === 'general') || channels[0];
  console.log(`2. Found channel: #${targetChannel.name} (${targetChannel.id})`);
  
  console.log("3. Sending test message...");
  const messageRes = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel: targetChannel.id,
      text: "🚨 [Test] Ordisum Slack OAuth Integration Smoke Test. If you see this, chat.postMessage works with the bot token! 🚨"
    })
  });
  
  const messageData = await messageRes.json();
  if (!messageData.ok) {
    console.error("Failed to send message:", messageData.error);
    process.exit(1);
  }
  
  console.log("✅ Message sent successfully!");
  console.log(messageData);
}

runSmokeTest().catch(console.error);
