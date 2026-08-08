const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs    = require('fs');
const path  = require('path');
const express = require('express');
const axios = require('axios');

// ─── استيراد الأوامر ──────────────────────────────────────────────────────────
const downloadCommands = require('./commands/download');
const videoCommands    = require('./commands/video');
const basicCommands    = require('./commands/basic');
const funCommands      = require('./commands/fun');
const searchCommands   = require('./commands/search');
const mediaCommands    = require('./commands/media');
const groupCommands    = require('./commands/group');
const apkCommands      = require('./commands/apk');
const ownerCommands    = require('./commands/owner');
// const numberCommands = require('./commands/numbers'); // ⏸️ موقوف مؤقتاً

const PREFIX = '.';
const OWNER     = '212698981459';
const OWNER_LID = '120363411194349526'; // LID الحقيقي للمطور

// ─── نظام antidm (منع/سماح الخاص) ──────────────────────────────────────────
const ANTIDM_FILE = path.join(__dirname, 'data', 'antidm.json');

function isAntiDmOn() {
    try { return JSON.parse(fs.readFileSync(ANTIDM_FILE, 'utf8')).enabled === true; } catch { return false; }
}
function setAntiDm(val) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.writeFileSync(ANTIDM_FILE, JSON.stringify({ enabled: val }));
}

let isReconnecting = false;
let botConnected   = false;

// ─── حالات الألعاب ───────────────────────────────────────────────────────────
const xoGames     = {};
const riddleGames = {};
const mathGames   = {};

process.on('uncaughtException',  e => console.error('❌ خطأ:', e.message));
process.on('unhandledRejection', e => console.error('❌ Promise:', e?.message || e));

// ─── صورة الغلاف فوق القائمة ─────────────────────────────────────────────────
const MENU_IMAGE = path.join(__dirname, 'attached_assets', 'InShot_20260801_145102307_1785783475637.jpg');

// ─── نص القائمة ──────────────────────────────────────────────────────────────
const MENU = `
╔═══════════════════════════════════╗
║  🤖  *B O T  N A Y  v 3 . 0*  🤖  ║
║       👑 *المطور: TOK LIK* 👑       ║
╚═══════════════════════════════════╝

┌─────────────────────────────────
│ 🧠 *[ ذكاء اصطناعي — جديد! ]*
└─────────────────────────────────
💬 *.ai سؤالك* — دردشة ذكية مع AI
💬 *.سؤال سؤالك* — نفس الشيء
💬 *.gpt / .chatgpt / .ذكاء* — بدائل
> اسألني أي شيء وسأجيبك بالعربية! 🌟

┌─────────────────────────────────
│ 📥 *[ تنزيل الفيديوهات ]*
└─────────────────────────────────
🎬 *.yt رابط* — يوتيوب فيديو
🎵 *.ytmp3 رابط* — يوتيوب موسيقى
📱 *.tiktok رابط* — تيك توك بدون علامة
📸 *.ig رابط* — انستغرام
📘 *.fb رابط* — فيسبوك
🐦 *.twitter رابط* — تويتر/X
🔗 *.dl رابط* — أي موقع آخر
> أو أرسل الرابط مباشرة للتحميل التلقائي ⚡

┌─────────────────────────────────
│ 📱 *[ تحميل التطبيقات والألعاب ]*
└─────────────────────────────────
📦 *.apk [اسم]* — تحميل أي تطبيق/لعبة
📋 *.apk apps* — قائمة التطبيقات
🎮 *.apk games* — قائمة الألعاب

┌─────────────────────────────────
│ 🎬 *[ تحويل صورة إلى فيديو ]*
└─────────────────────────────────
✨ *.فيديو [تأثير]* — رد على صورة وحرّكها
📋 *.تأثيرات* — عرض جميع التأثيرات
> التأثيرات: zoom | shake | fade | pulse | rotate

┌─────────────────────────────────
│ 🛠️ *[ أدوات ذكية ]*
└─────────────────────────────────
🔍 *.wiki موضوع* — بحث ويكيبيديا
🌤️ *.weather مدينة* — حالة الطقس
🌍 *.translate نص* — ترجمة للعربية
🔊 *.tts نص* — نص إلى كلام مسموع
🧮 *.calc عملية* — آلة حاسبة ذكية
💱 *.عملة 100 USD* — تحويل العملات
⚖️ *.bmi وزن طول* — مؤشر كتلة الجسم
⏱️ *.timer ثوانٍ* — مؤقت زمني
🔐 *.password* — توليد كلمة مرور قوية
🔒 *.encode نص* — تشفير base64
🔓 *.decode نص* — فك تشفير base64

┌─────────────────────────────────
│ 😂 *[ ترفيه ونكت ]*
└─────────────────────────────────
🎭 *.طرفة* — نكتة مضحكة
💡 *.حقيقة* — معلومة مثيرة للاهتمام
✨ *.اقتباس* — حكمة وملهمة
🔮 *.برج الحمل* — حظك اليوم (مثال)
💘 *.حب اسم1 اسم2* — مقياس الحب 💕
💑 *.شيب اسم1 اسم2* — ship name 🚢
🎲 *.نرد* — رمي النرد
🪙 *.عملة* — صورة أو كتابة
🎱 *.8ball سؤالك* — الكرة السحرية
✊ *.rps حجر/ورق/مقص* — تحدّني!
🤔 *.تفضل* — هل تفضل؟
🔥 *.tod صراحة/جرأة* — صراحة أم جرأة
🎨 *.ascii نص* — فن ASCII

┌─────────────────────────────────
│ 🕌 *[ إسلامي ]*
└─────────────────────────────────
🤲 *.دعاء* — دعاء يومي مختار
📖 *.قران* — آية كريمة عشوائية

┌─────────────────────────────────
│ 🎮 *[ ألعاب تفاعلية ]*
└─────────────────────────────────
❌⭕ *.xo* — لعبة X/O مع البوت
🧩 *.لغز* — لغز واختبر ذكاءك
🧮 *.math* — تحدي الرياضيات السريع

┌─────────────────────────────────
│ 🖼️ *[ صور وميديا ]*
└─────────────────────────────────
🐱 *.cat* — صورة قطة عشوائية
🐶 *.dog* — صورة كلب عشوائي
😂 *.meme* — ميم مضحك
🏷️ *.sticker* — صورة → ملصق واتساب
🖼️ *.toimg* — ملصق → صورة عادية

┌─────────────────────────────────
│ 👥 *[ إدارة المجموعات ]*
└─────────────────────────────────
👋 *.kick @شخص* — طرد عضو
➕ *.add رقم* — إضافة عضو
⬆️ *.promote @شخص* — ترقية لمشرف
⬇️ *.demote @شخص* — سحب الإدارة
🔇 *.mute* — إسكات المجموعة
🔊 *.unmute* — فتح الكلام للكل
⚠️ *.warn @شخص* — إرسال تحذير
📋 *.warnings @شخص* — عدد التحذيرات
🗑️ *.del* — حذف رسالة (رد عليها)
🔗 *.antilink on/off* — منع الروابط
📣 *.tagadmins* — تنبيه المشرفين
ℹ️ *.groupinfo* — معلومات المجموعة
🔗 *.link* — رابط دعوة المجموعة
🔄 *.setname اسم* — تغيير اسم المجموعة
📢 *.everyone* — منشن جميع الأعضاء

┌─────────────────────────────────
│ 📊 *[ معلومات البوت ]*
└─────────────────────────────────
🏓 *.ping* — اختبار سرعة البوت
⏱️ *.uptime* — وقت تشغيل البوت
ℹ️ *.info* — معلومات عن البوت
🕐 *.time* — التوقيت الحالي
👤 *.profile* — ملفك الشخصي
👑 *.owner* / *.مطور* — معلومات المطور

┌─────────────────────────────────
│ 👑 *[ أوامر المطور — خاص بالمالك ]*
└─────────────────────────────────
🔐 *.مطور* — لوحة التحكم الكاملة
📊 *.حالة_بوت* — حالة البوت والذاكرة
📈 *.إحصائيات* — إحصائيات المجموعات
📋 *.قائمة_مجموعات* — جميع المجموعات
📢 *.بث_كل رسالة* — بث لكل المجموعات
✉️ *.إرسال رقم رسالة* — إرسال خاص
🚫 *.حظر رقم* — حظر مستخدم
✅ *.رفع_حظر رقم* — رفع الحظر
💥 *.طرد_كل* — طرد جميع الأعضاء
🚪 *.مغادرة* — مغادرة المجموعة
⚙️ *.اسم_بوت* / *.حالة_نص* / *.صورة_بوت*
🔄 *.إعادة_تشغيل* — إعادة تشغيل البوت
🔴 *.إيقاف* — إيقاف البوت
📵 *.antidm on* — منع الخاص (حظر تلقائي)
📲 *.antidm off* — السماح بالخاص للجميع

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *BOT NAY v3.0* | 👨‍💻 *TOK LIK*
💎 _أفضل بوت واتساب في المغرب_ 🇲🇦
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

// ─── إرسال القائمة مع الصورة ─────────────────────────────────────────────────
async function sendMenu(sock, jid) {
    try {
        if (fs.existsSync(MENU_IMAGE)) {
            const img = fs.readFileSync(MENU_IMAGE);
            await sock.sendMessage(jid, { image: img, caption: MENU });
        } else {
            await sock.sendMessage(jid, { text: MENU });
        }
    } catch (e) {
        await sock.sendMessage(jid, { text: MENU });
    }
}

// ─── ذكاء اصطناعي مجاني ──────────────────────────────────────────────────────
async function aiChat(sock, jid, question) {
    const waitMsg = await sock.sendMessage(jid, { text: '🤖 *جاري التفكير...*' });
    try {
        const systemPrompt = 'أنت مساعد ذكي اسمك BOT NAY، تجيب دائماً بالعربية بشكل مختصر ومفيد وودي. لا تكتب أكثر من 300 كلمة.';
        const url = `https://text.pollinations.ai/${encodeURIComponent(question)}?model=openai&system=${encodeURIComponent(systemPrompt)}&seed=${Math.floor(Math.random()*9999)}`;
        const res = await axios.get(url, {
            timeout: 30000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const answer = (typeof res.data === 'string' ? res.data : JSON.stringify(res.data)).trim();
        if (!answer) throw new Error('empty');
        await sock.sendMessage(jid, {
            text: `🤖 *BOT NAY AI:*\n\n${answer}\n\n_💬 اكتب .ai سؤالك للمزيد_`,
            edit: waitMsg.key
        });
    } catch (e) {
        await sock.sendMessage(jid, {
            text: '❌ تعذر الاتصال بالذكاء الاصطناعي، حاول مجدداً.',
            edit: waitMsg.key
        });
    }
}

// ─── ربط معالجات البوت بأي socket ────────────────────────────────────────────
function setupBotHandlers(sock, saveCreds) {
    isReconnecting = false;
    botConnected   = true;
    console.log('\n✅ BOT NAY متصل!\n🤖 جاهز للعمل...\n');

    sock.ev.on('creds.update', saveCreds);

    // ─── أحداث المجموعات ──────────────────────────────────────────────────────
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        try {
            if (action === 'add')    await groupCommands.handleJoin(sock, id, participants);
            if (action === 'remove') await groupCommands.handleLeave(sock, id, participants);
        } catch (e) { console.error('خطأ في أحداث المجموعة:', e.message); }
    });

    sock.ev.on('groups.update', async (updates) => {
        try { await groupCommands.handleGroupUpdate(sock, updates); } catch (e) {}
    });

    // ─── الاتصال ──────────────────────────────────────────────────────────────
    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            isReconnecting = false;
            botConnected   = false;
            const statusCode = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output?.statusCode : null;
            const reason   = lastDisconnect?.error?.message || '';
            const loggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
            const conflict  = reason.includes('conflict') || reason.includes('replaced');
            console.log(`🔴 انقطع الاتصال [${statusCode}]: ${reason}`);
            if (loggedOut) {
                console.log('🚪 الجلسة منتهية — افتح صفحة الربط من جديد');
                try {
                    const authDir = path.join(__dirname, 'auth_info');
                    fs.readdirSync(authDir).forEach(f => fs.unlinkSync(path.join(authDir, f)));
                } catch (_) {}
            } else if (conflict) {
                console.log('⚠️ تعارض جلسة — إعادة الاتصال بعد 15 ثوانٍ...');
                setTimeout(startBot, 15000);
            } else {
                console.log('🔄 إعادة الاتصال بعد 5 ثوانٍ...');
                setTimeout(startBot, 5000);
            }
        } else if (connection === 'open') {
            isReconnecting = false;
            botConnected   = true;
            console.log('\n✅ BOT NAY متصل!\n🤖 جاهز للعمل...\n');
        } else if (connection === 'connecting') {
            botConnected = false;
        }
    });

    // ─── معالج الرسائل ────────────────────────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            try {
                if (!msg.message) continue;
                if (msg.key.fromMe) continue; // تجاهل رسائل البوت نفسه

                const jid    = msg.key.remoteJid;
                if (!jid) continue;
                if (jid === 'status@broadcast') continue;

                // ─── تحديد المرسل وفحص المطور ───────────────────────────
                const isGroup   = jid.endsWith('@g.us');
                const senderRaw = msg.key.participant || msg.key.remoteJid;
                const senderNum = senderRaw.split('@')[0].split(':')[0];
                // فحص المطور: برقم الهاتف أو بـ LID
                const isOwnerSender = (senderNum === OWNER || senderNum === OWNER_LID);
                // ✅ نمرر النتيجة للأوامر حتى لا تعيد الفحص وتفشل
                msg._isOwner = isOwnerSender;

                if (!isGroup && !isOwnerSender && isAntiDmOn()) {
                    // حظر تلقائي فوري
                    try { await sock.updateBlockStatus(senderRaw, 'block'); } catch (_) {}
                    continue;
                }

                const text = (
                    msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    msg.message?.imageMessage?.caption ||
                    msg.message?.videoMessage?.caption ||
                    ''
                ).trim();

                // ─── فحص روابط في المجموعات ──────────────────────────────────
                if (jid.endsWith('@g.us') && text) {
                    const sender = msg.key.participant || msg.key.remoteJid;
                    const hasLink = /https?:\/\/|wa\.me|chat\.whatsapp\.com/i.test(text);
                    if (hasLink) {
                        await groupCommands.handleLinkDetection(sock, msg, jid, sender);
                    }
                }

                if (!text) continue;

                const isCmd = text.startsWith(PREFIX);

                if (isCmd) {
                    const [rawCmd, ...args] = text.slice(PREFIX.length).trim().split(' ');
                    const cmd = rawCmd.toLowerCase();
                    console.log(`📨 ${jid.split('@')[0]} → .${cmd} ${args.join(' ')}`);

                    switch (cmd) {

                        // ─── القائمة الرئيسية ─────────────────────────────────
                        case 'menu':
                        case 'قائمة':
                        case 'help':
                        case 'مساعدة':
                            await sendMenu(sock, jid);
                            break;

                        // ─── ذكاء اصطناعي ────────────────────────────────────
                        case 'ai':
                        case 'سؤال':
                        case 'ذكاء':
                        case 'gpt':
                        case 'chatgpt': {
                            const q = args.join(' ');
                            if (!q) {
                                await sock.sendMessage(jid, {
                                    text: '🤖 *BOT NAY AI*\n\n📌 الصيغة: *.ai سؤالك*\n✏️ مثال: *.ai ما هي عاصمة المغرب؟*\n\n💬 _أسألني أي شيء!_'
                                });
                            } else {
                                await aiChat(sock, jid, q);
                            }
                            break;
                        }

                        // ─── تنزيل الفيديوهات ────────────────────────────────
                        case 'yt':
                        case 'يوتيوب':
                            await downloadCommands.yt(sock, msg, args);
                            break;

                        case 'ytmp3':
                        case 'موسيقى':
                        case 'mp3':
                            await downloadCommands.ytmp3(sock, msg, args);
                            break;

                        case 'tiktok':
                        case 'تيك':
                        case 'تيكتوك':
                        case 'tk':
                            await downloadCommands.tiktok(sock, msg, args);
                            break;

                        case 'ig':
                        case 'انستغرام':
                        case 'انستجرام':
                        case 'instagram':
                            await downloadCommands.ig(sock, msg, args);
                            break;

                        case 'fb':
                        case 'فيسبوك':
                        case 'facebook':
                            await downloadCommands.fb(sock, msg, args);
                            break;

                        case 'twitter':
                        case 'تويتر':
                        case 'tw':
                            await downloadCommands.twitter(sock, msg, args);
                            break;

                        case 'dl':
                        case 'تنزيل':
                        case 'download':
                            await downloadCommands.dl(sock, msg, args);
                            break;

                        // ─── تحويل الصور لفيديو ───────────────────────────────
                        case 'فيديو':
                        case 'video':
                            await videoCommands.imageToVideo(sock, msg, args);
                            break;

                        case 'تأثيرات':
                        case 'effects':
                            await videoCommands.effectsList(sock, msg);
                            break;

                        // ─── تحميل التطبيقات ──────────────────────────────────
                        case 'apk':
                        case 'تطبيق':
                        case 'app': {
                            const sub = args[0]?.toLowerCase();
                            if (!sub)              await apkCommands.showMenu(sock, msg);
                            else if (sub === 'apps')  await apkCommands.showApps(sock, msg);
                            else if (sub === 'games') await apkCommands.showGames(sock, msg);
                            else                   await apkCommands.getApp(sock, msg, args.join(' '));
                            break;
                        }

                        // ─── معلومات البوت ───────────────────────────────────
                        case 'ping':
                            await basicCommands.ping(sock, msg);
                            break;

                        case 'uptime':
                        case 'وقت':
                            await basicCommands.uptime(sock, msg);
                            break;

                        case 'info':
                        case 'معلومات':
                            await basicCommands.info(sock, msg);
                            break;

                        case 'time':
                        case 'الوقت':
                        case 'توقيت':
                            await basicCommands.time(sock, msg);
                            break;

                        case 'owner':
                        case 'مطور':
                        case 'المطور':
                            if (isOwnerSender) {
                                await ownerCommands.ownerMenu(sock, msg);
                            } else {
                                await basicCommands.owner(sock, msg);
                            }
                            break;

                        // ─── أدوات ────────────────────────────────────────────
                        case 'calc':
                        case 'حساب':
                            await basicCommands.calc(sock, msg, args);
                            break;

                        case 'password':
                        case 'باسورد':
                        case 'كلمة_مرور':
                            await basicCommands.password(sock, msg, args);
                            break;

                        case 'reverse':
                        case 'عكس':
                            await basicCommands.reverse(sock, msg, args);
                            break;

                        case 'upper':
                        case 'كبير':
                            await basicCommands.upper(sock, msg, args);
                            break;

                        case 'lower':
                        case 'صغير':
                            await basicCommands.lower(sock, msg, args);
                            break;

                        case 'count':
                        case 'عد':
                            await basicCommands.count(sock, msg, args);
                            break;

                        case 'encode':
                        case 'تشفير':
                            await basicCommands.encode(sock, msg, args);
                            break;

                        case 'decode':
                        case 'فك':
                            await basicCommands.decode(sock, msg, args);
                            break;

                        case 'translate':
                        case 'ترجمة':
                        case 'ترجم':
                            await basicCommands.translate(sock, msg, args);
                            break;

                        case 'weather':
                        case 'طقس':
                            await basicCommands.weather(sock, msg, args);
                            break;

                        case 'wiki':
                        case 'ويكي':
                        case 'بحث':
                            await basicCommands.wiki(sock, msg, args);
                            break;

                        case 'math':
                            await basicCommands.math(sock, msg);
                            break;

                        case 'timer':
                        case 'مؤقت':
                            await basicCommands.timer(sock, msg, args);
                            break;

                        case 'bmi':
                            await basicCommands.bmi(sock, msg, args);
                            break;

                        case 'عملة':
                        case 'currency':
                            await basicCommands.currency(sock, msg, args);
                            break;

                        case 'tts':
                        case 'صوت':
                        case 'كلام':
                            await searchCommands.tts(sock, msg, args);
                            break;

                        // ─── ترفيه ────────────────────────────────────────────
                        case 'طرفة':
                        case 'joke':
                        case 'نكتة':
                            await basicCommands.joke(sock, msg);
                            break;

                        case 'حقيقة':
                        case 'fact':
                        case 'معلومة':
                            await basicCommands.fact(sock, msg);
                            break;

                        case 'اقتباس':
                        case 'quote':
                        case 'حكمة':
                            await basicCommands.quote(sock, msg);
                            break;

                        case 'دعاء':
                        case 'dua':
                            await funCommands.dua(sock, msg);
                            break;

                        case 'قران':
                        case 'quran':
                        case 'آية':
                        case 'اية':
                            await funCommands.quran(sock, msg);
                            break;

                        case 'حظ':
                        case 'fortune':
                            await funCommands.fortune(sock, msg);
                            break;

                        case 'حب':
                        case 'love':
                        case 'lovemeter':
                            await basicCommands.lovemeter(sock, msg, args);
                            break;

                        case 'شيب':
                        case 'ship':
                            await basicCommands.ship(sock, msg, args);
                            break;

                        case 'برج':
                        case 'zodiac':
                        case 'horoscope':
                            await basicCommands.zodiac(sock, msg, args);
                            break;

                        case 'نرد':
                        case 'dice':
                        case 'roll':
                            await basicCommands.roll(sock, msg, args);
                            break;

                        case 'عملة_رمي':
                        case 'flip':
                        case 'coin':
                            await basicCommands.flip(sock, msg);
                            break;

                        case '8ball':
                            await basicCommands['8ball'](sock, msg, args);
                            break;

                        case 'rps':
                        case 'حجر_ورق':
                            await basicCommands.rps(sock, msg, args);
                            break;

                        case 'تفضل':
                        case 'wouldyou':
                            await basicCommands.wouldyou(sock, msg);
                            break;

                        case 'tod':
                        case 'صراحة':
                        case 'جرأة':
                        case 'truthordare':
                            await basicCommands.truthordare(sock, msg, args);
                            break;

                        case 'ascii':
                            await basicCommands.ascii(sock, msg, args);
                            break;

                        case 'لون':
                        case 'color':
                            await basicCommands.random_color(sock, msg);
                            break;

                        case 'random':
                        case 'عشوائي':
                            await basicCommands.number(sock, msg, args);
                            break;

                        // ─── ألعاب ────────────────────────────────────────────
                        case 'xo':
                        case 'xo_game':
                            await basicCommands.xo(sock, msg, args, xoGames);
                            break;

                        case 'لغز':
                        case 'riddle':
                            await basicCommands.riddle(sock, msg, riddleGames);
                            break;

                        // ─── صور وميديا ───────────────────────────────────────
                        case 'cat':
                        case 'قطة':
                            await mediaCommands.cat(sock, msg);
                            break;

                        case 'dog':
                        case 'كلب':
                            await mediaCommands.dog(sock, msg);
                            break;

                        case 'meme':
                        case 'ميم':
                            await mediaCommands.meme(sock, msg);
                            break;

                        case 'sticker':
                        case 'ملصق':
                            await mediaCommands.sticker(sock, msg);
                            break;

                        case 'toimg':
                        case 'صورة':
                            await mediaCommands.toimg(sock, msg);
                            break;

                        // ─── الملف الشخصي ─────────────────────────────────────
                        case 'profile':
                        case 'بروفايل':
                            await basicCommands.profile(sock, msg);
                            break;

                        case 'everyone':
                        case 'الكل':
                        case 'منشن':
                            await basicCommands.everyone(sock, msg);
                            break;

                        case 'greet':
                        case 'مرحبا':
                            await basicCommands.greetUser(sock, msg);
                            break;

                        // ─── أوامر المجموعة ───────────────────────────────────
                        case 'kick':
                        case 'طرد':
                            await groupCommands.kick(sock, msg, args);
                            break;

                        case 'add':
                        case 'اضافة':
                        case 'أضف':
                            await groupCommands.add(sock, msg, args);
                            break;

                        case 'promote':
                        case 'ترقية':
                            await groupCommands.promote(sock, msg, args);
                            break;

                        case 'demote':
                        case 'سحب':
                            await groupCommands.demote(sock, msg, args);
                            break;

                        case 'mute':
                        case 'اسكات':
                            await groupCommands.mute(sock, msg);
                            break;

                        case 'unmute':
                        case 'فتح':
                            await groupCommands.unmute(sock, msg);
                            break;

                        case 'link':
                        case 'رابط':
                            await groupCommands.getLink(sock, msg);
                            break;

                        case 'revokelink':
                        case 'رابط_جديد':
                            await groupCommands.revokeLink(sock, msg);
                            break;

                        case 'groupinfo':
                        case 'معلومات_المجموعة':
                        case 'infogroup':
                            await groupCommands.groupInfo(sock, msg);
                            break;

                        case 'warn':
                        case 'تحذير':
                            await groupCommands.warn(sock, msg, args);
                            break;

                        case 'warnings':
                        case 'تحذيرات':
                            await groupCommands.warnings(sock, msg, args);
                            break;

                        case 'clearwarn':
                        case 'مسح_تحذيرات':
                            await groupCommands.clearWarn(sock, msg, args);
                            break;

                        case 'del':
                        case 'حذف':
                            await groupCommands.deleteMsg(sock, msg);
                            break;

                        case 'antilink':
                        case 'ضد_الروابط':
                            await groupCommands.toggleAntiLink(sock, msg, args);
                            break;

                        case 'tagadmins':
                        case 'مشرفين':
                        case 'تنبيه_مشرفين':
                            await groupCommands.tagAdmins(sock, msg, args);
                            break;

                        case 'setname':
                        case 'اسم_المجموعة':
                            await groupCommands.setGroupName(sock, msg, args);
                            break;

                        case 'setdesc':
                        case 'وصف_المجموعة':
                            await groupCommands.setGroupDesc(sock, msg, args);
                            break;

                        case 'broadcast':
                        case 'بث':
                            await groupCommands.broadcast(sock, msg, args);
                            break;

                        case 'ownerinfo':
                        case 'لوحة_التحكم':
                            await groupCommands.ownerInfo(sock, msg);
                            break;

                        // ─── نظام الترخيص ────────────────────────────────────
                        case 'طلب_بوت':
                        case 'requestbot':
                            await groupCommands.requestBot(sock, msg);
                            break;

                        case 'قبول':
                        case 'approve':
                            await groupCommands.approveBot(sock, msg, args);
                            break;

                        case 'رفض':
                        case 'reject':
                            await groupCommands.rejectBot(sock, msg, args);
                            break;

                        case 'كود':
                        case 'activate':
                            await groupCommands.activateLicense(sock, msg, args);
                            break;

                        case 'ترخيص':
                        case 'license':
                            await groupCommands.licenseStatus(sock, msg);
                            break;

                        case 'طلبات':
                        case 'pending':
                            await groupCommands.listPending(sock, msg);
                            break;

                        // ─── الأرقام الوهمية موقوفة ───────────────────────────
                        case 'رقم':
                        case 'تحقق':
                        case 'الغ':
                        case 'رصيد':
                        case 'اعداد':
                            await sock.sendMessage(jid, {
                                text: `╔══════════════════════╗\n║  ⏸️ *ميزة موقوفة*    ║\n╚══════════════════════╝\n\n🚫 هذه الميزة موقوفة مؤقتاً بأمر من المطور\n\n🤖 _BOT NAY v3.0 | TOK LIK_`
                            });
                            break;

                        // ════════════════════════════════════════════════════
                        // 👑 أوامر المطور الحصرية
                        // ════════════════════════════════════════════════════

                        case 'لوحة':
                        case 'owner_menu':
                        case 'أوامر_مطور':
                            await ownerCommands.ownerMenu(sock, msg);
                            break;

                        case 'حالة_بوت':
                        case 'bot_status':
                            await ownerCommands.botStatus(sock, msg);
                            break;

                        case 'إحصائيات':
                        case 'احصائيات':
                        case 'stats':
                            await ownerCommands.botStats(sock, msg);
                            break;

                        case 'قائمة_مجموعات':
                        case 'all_groups':
                            await ownerCommands.allGroups(sock, msg);
                            break;

                        case 'بث_كل':
                        case 'broadcast_all':
                            await ownerCommands.broadcastAll(sock, msg, args);
                            break;

                        case 'إرسال':
                        case 'ارسال':
                        case 'send_private':
                            await ownerCommands.sendPrivate(sock, msg, args);
                            break;

                        case 'حظر':
                        case 'block':
                            await ownerCommands.blockUser(sock, msg, args);
                            break;

                        case 'رفع_حظر':
                        case 'unblock':
                            await ownerCommands.unblockUser(sock, msg, args);
                            break;

                        case 'طرد_كل':
                        case 'kick_all':
                            await ownerCommands.kickAll(sock, msg);
                            break;

                        case 'مغادرة':
                        case 'leave':
                            await ownerCommands.leaveGroup(sock, msg, args);
                            break;

                        case 'اسم_بوت':
                        case 'set_name':
                            await ownerCommands.setBotName(sock, msg, args);
                            break;

                        case 'حالة_نص':
                        case 'set_bio':
                            await ownerCommands.setBotBio(sock, msg, args);
                            break;

                        case 'صورة_بوت':
                        case 'set_pp':
                            await ownerCommands.setBotPP(sock, msg);
                            break;

                        case 'إعادة_تشغيل':
                        case 'اعادة_تشغيل':
                        case 'restart':
                            await ownerCommands.restartBot(sock, msg);
                            break;

                        case 'إيقاف':
                        case 'ايقاف':
                        case 'stop':
                            await ownerCommands.stopBot(sock, msg);
                            break;

                        case 'أدمن_مطور':
                        case 'ادمن_مطور':
                            await ownerCommands.makeAdmin(sock, msg, args);
                            break;

                        case 'سحب_أدمن':
                        case 'سحب_ادمن':
                            await ownerCommands.removeAdmin(sock, msg, args);
                            break;

                        // ─── أمر antidm: تفعيل/إيقاف الخاص ──────────────────
                        case 'antidm':
                        case 'منع_خاص':
                        case 'خاص': {
                            if (!isOwnerSender) {
                                await sock.sendMessage(jid, { text: `🔐 *أمر خاص بالمطور فقط!*\n🤖 _BOT NAY v3.0_` });
                                break;
                            }
                            const sub = args[0]?.toLowerCase();
                            if (sub === 'on' || sub === 'تشغيل') {
                                setAntiDm(true);
                                await sock.sendMessage(jid, {
                                    text: `╔══════════════════════════╗\n║  📵 *تم تفعيل منع الخاص*  ║\n╚══════════════════════════╝\n\n🔴 *الوضع:* الخاص مُغلق الآن\n⚡ أي شخص يراسل البوت في الخاص سيُحظر تلقائياً\n\n🔓 للفتح مجدداً: *.antidm off*\n🤖 _BOT NAY v3.0 | TOK LIK_`
                                });
                            } else if (sub === 'off' || sub === 'إيقاف' || sub === 'ايقاف') {
                                setAntiDm(false);
                                await sock.sendMessage(jid, {
                                    text: `╔══════════════════════════╗\n║  📲 *تم فتح الخاص للجميع* ║\n╚══════════════════════════╝\n\n🟢 *الوضع:* الخاص مفتوح الآن\n✅ يمكن لأي شخص محادثة البوت في الخاص\n\n🔒 للإغلاق: *.antidm on*\n🤖 _BOT NAY v3.0 | TOK LIK_`
                                });
                            } else {
                                const status = isAntiDmOn();
                                await sock.sendMessage(jid, {
                                    text: `╔══════════════════════════╗\n║  ⚙️ *إعداد الخاص (DM)*    ║\n╚══════════════════════════╝\n\n📊 *الحالة الحالية:* ${status ? '🔴 مُغلق (antidm ON)' : '🟢 مفتوح (antidm OFF)'}\n\n📌 *الأوامر:*\n🔴 *.antidm on* — منع الخاص وحظر من يراسل\n🟢 *.antidm off* — فتح الخاص للجميع\n\n🤖 _BOT NAY v3.0 | TOK LIK_`
                                });
                            }
                            break;
                        }

                        default:
                            await sock.sendMessage(jid, {
                                text: `╔══════════════════════╗\n║  ❓ *أمر غير معروف*  ║\n╚══════════════════════╝\n\n🔍 الأمر *_.${cmd}_* غير موجود\n\n📋 اكتب *.menu* لرؤية جميع الأوامر\n🤖 _BOT NAY v3.0 | TOK LIK_`
                            });
                    }

                } else if (text) {

                    // ─── إجابة لغز ───────────────────────────────────────────
                    if (riddleGames[jid] && text.toLowerCase().includes(riddleGames[jid])) {
                        const correct = riddleGames[jid];
                        delete riddleGames[jid];
                        await sock.sendMessage(jid, {
                            text: `🎉 *إجابة صحيحة!*\n\n✅ الجواب: *${correct}*\n\n🏆 أحسنت! اكتب *.لغز* للغز جديد\n🤖 *BOT NAY | TOK LIK*`
                        });
                        continue;
                    }

                    // ─── إجابة تحدي الرياضيات ────────────────────────────────
                    if (mathGames[jid] && /^\d+$/.test(text.trim())) {
                        const game = mathGames[jid];
                        if (text.trim() === game.answer) {
                            clearTimeout(game.timeout);
                            delete mathGames[jid];
                            await sock.sendMessage(jid, {
                                text: `🎉 *إجابة صحيحة!*\n\n✅ الجواب: *${game.answer}*\n\n🏆 عبقري! اكتب *.math* لتحدٍ جديد\n🤖 *BOT NAY | TOK LIK*`
                            });
                        } else {
                            await sock.sendMessage(jid, {
                                text: `❌ *إجابة خاطئة!*\n\n💡 حاول مرة أخرى...\n🤖 *BOT NAY | TOK LIK*`
                            });
                        }
                        continue;
                    }

                    // ─── تنزيل تلقائي عند إرسال رابط ────────────────────────
                    const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
                    if (urlMatch) {
                        await downloadCommands.autoDownload(sock, msg, urlMatch[1]);
                    }
                }

            } catch (e) {
                console.error('خطأ في معالجة الرسالة:', e.message);
            }
        }
    });
}

// ─── تشغيل البوت (للإعادة بعد قطع الاتصال) ──────────────────────────────────
async function startBot() {
    if (isReconnecting) return;
    isReconnecting = true;

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();
    console.log(`🔄 واتساب ويب: ${version.join('.')}`);

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 500,
        generateHighQualityLinkPreview: false,
        getMessage: async () => ({ conversation: '' })
    });

    setupBotHandlers(sock, saveCreds);
}

// ─── خادم الويب ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/status', (req, res) => {
    res.json({ connected: botConnected, bot: 'BOT NAY v3.0' });
});

app.get('/pair', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/request-code', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.json({ error: 'رقم الهاتف مطلوب' });

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 8) return res.json({ error: 'رقم غير صالح' });

        // مسح بيانات قديمة إن وجدت
        try {
            const authDir = path.join(__dirname, 'auth_info');
            fs.readdirSync(authDir).forEach(f => fs.unlinkSync(path.join(authDir, f)));
        } catch (_) {}

        isReconnecting = false;

        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        const { version } = await fetchLatestBaileysVersion();

        const pSock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.ubuntu('Chrome'),
            syncFullHistory: false,
            markOnlineOnConnect: false,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            getMessage: async () => ({ conversation: '' })
        });

        pSock.ev.on('creds.update', saveCreds);

        // عند فتح الاتصال أو stream:error 515 (restart required بعد الإقران)
        let paired = false;
        pSock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
            if (connection === 'open' && !paired) {
                paired = true;
                console.log('✅ تم الإقران! البوت يعمل الآن...');
                setupBotHandlers(pSock, saveCreds);
            } else if (connection === 'close' && !paired) {
                const reason = lastDisconnect?.error?.message || '';
                const isRestart = reason.includes('restart') || reason.includes('515')
                    || reason.includes('Stream Errored');
                if (isRestart) {
                    console.log('🔄 إعادة الاتصال بعد الإقران...');
                    isReconnecting = false;
                    setTimeout(startBot, 2000);
                }
            }
        });

        await new Promise(r => setTimeout(r, 3000));
        const rawCode = await pSock.requestPairingCode(cleanPhone);
        const formatted = rawCode.match(/.{1,4}/g).join('-');
        console.log(`🔑 كود الربط: ${formatted}`);
        res.json({ code: formatted });

    } catch (e) {
        console.error('خطأ في طلب الكود:', e.message);
        res.json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔════════════════════════════════╗`);
    console.log(`║   🤖 BOT NAY v3.0 - جاري التشغيل   ║`);
    console.log(`╚════════════════════════════════╝`);
    console.log(`🌐 صفحة الربط تعمل على المنفذ ${PORT}`);

    const hasAuth = (() => {
        try { return fs.readdirSync(path.join(__dirname, 'auth_info')).length > 0; } catch (_) { return false; }
    })();

    if (hasAuth) {
        console.log('✅ بيانات الربط موجودة — جاري تشغيل البوت...');
        startBot().catch(e => {
            console.error('خطأ في تشغيل البوت:', e.message);
            setTimeout(startBot, 5000);
        });
    } else {
        console.log('⚠️  لا توجد بيانات ربط — افتح صفحة الويب للربط');
    }
});
