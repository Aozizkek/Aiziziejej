const axios = require('axios');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const moment = require('moment');
require('dotenv').config();

const ADD_MGM_DASHBOARD = "https://ibiza.ooredoo.dz/api/v1/mobile-bff/users/mgm/info/apply";
const GET_USER_BUNDLE_BALANCE = "https://ibiza.ooredoo.dz/api/v1/mobile-bff/users/balance";
const REFRESH_TOKEN_URL = "https://ibiza.ooredoo.dz/auth/realms/ibiza/protocol/openid-connect/token";

const bot = new TelegramBot("6808641099:AAHtqPrcYYzkuMgn73rv4tkM6epYzQtMRKU", { polling: true });
const USER_DATA_FILE = path.join(__dirname, "user_data.json");

const loadUserData = () => {
    if (fs.existsSync(USER_DATA_FILE)) {
        return JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf8'));
    } else {
        return {};
    }
};

const saveUserData = (userData) => {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(userData, null, 2));
};

let userData = loadUserData();

const isAdmin = (userId) => {
    return userId === "6035997235";
};

const sendWelcomeMessage = (chatId, userName, days, hours, minutes) => {
    const options = {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "📱 إرسال رقم الهاتف", callback_data: "send_phone_number" }],
                [{ text: "تحديث الانترنت🎁", callback_data: "refresh_access_token" }]
            ]
        }
    };
    bot.sendMessage(chatId, `<b>💀 مرحبًا، ${userName}! أنت الآن مفعل في بوت AZIZ.</b>\n\n<b>🕘 الوقت المتبقي لك:</b> <i>${days}</i> <b>يوم</b> <i>${hours}</i> <b>ساعة</b> <i>${minutes}</i> <b>دقيقة</b>\n\n<strong>يرجى إرسال رقمك يوز لمواصلة العملية📨✅</strong>`, options);
};

const sendNotificationMessage = (chatId, userName) => {
    bot.sendMessage(chatId, `<strong>💔 آسف، ${userName}!</strong> <strong>انتهت صلاحية استخدام البوت.</strong>\n<strong>الرجاء التواصل مع المسؤول لتجديد الاشتراك</strong>\n<strong>المطور:</strong> <strong><a href="https://t.me/aziz_plug">AZIZ</a></strong>\n<strong>القناة:</strong> <strong><a href="https://t.me/groupbotaziz"> Aziz groupe</a></strong>`, { parse_mode: "HTML" });
};

const sendAdminPanel = (chatId) => {
    let message = "<strong>📋 قائمة المستخدمين 💻:</strong>\n\n";
    Object.entries(userData).forEach(([userId, data]) => {
        const expirationDate = moment(data.expiration_date, "YYYY-MM-DD HH:mm:ss");
        const timeLeft = moment.duration(expirationDate.diff(moment()));
        const days = timeLeft.days();
        const hours = timeLeft.hours();
        const minutes = timeLeft.minutes();
        message += `<b>💀 المستخدم:</b> <b><em>${userId}</em></b>\n\n<b>🕘 الوقت المتبقي:</b> <i>${days}</i> <b>يوم</b> <i>${hours}</i> <b>ساعة</b> <i>${minutes}</i> <b>دقيقة</b>\n\n`;
    });

    const options = {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🗓️ إضافة وقت ⏳", callback_data: "add_time" },
                    { text: "💀 إضافة مستخدم💀 ", callback_data: "add_user" }
                ],
                [{ text: "❌ إزالة مستخدم", callback_data: "remove_user" }]
            ]
        }
    };

    bot.sendMessage(chatId, message, options);
};

bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    if (isAdmin(userId)) {
        sendAdminPanel(chatId);
    } else {
        bot.sendMessage(chatId, "<b>❌ ليس لديك الصلاحية لاستخدام هذا الأمر</b>", { parse_mode: "HTML" });
    }
});

const getUserIdHandler = (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.text;
    bot.sendMessage(chatId, "<b><i>الرجاء إدخال عدد 🔢 الأيام للإضافة➕:</i></b>", { parse_mode: "HTML" });
    bot.once('message', (msg) => addUserWithLimitHandler(userId, msg));
};

const addUserWithLimitHandler = (userId, msg) => {
    const chatId = msg.chat.id;
    const days = parseInt(msg.text, 10);
    if (!isNaN(days)) {
        const expirationDate = moment().add(days, 'days').format("YYYY-MM-DD HH:mm:ss");
        userData[userId] = { expiration_date: expirationDate };
        saveUserData(userData);
        bot.sendMessage(chatId, "<b>✅ تمت إضافة المستخدم بنجاح</b>", { parse_mode: "HTML" });
    } else {
        bot.sendMessage(chatId, "<b>❌ رقم غير صالح, الرجاء إدخال عدد صحيح للأيام</b>", { parse_mode: "HTML" });
    }
};

const deleteUserHandler = (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.text;
    if (userId in userData) {
        delete userData[userId];
        saveUserData(userData);
        bot.sendMessage(chatId, "<b>✅ تمت إزالة المستخدم بنجاح</b>", { parse_mode: "HTML" });
    } else {
        bot.sendMessage(chatId, "<b>❌ المستخدم غير موجود</b>", { parse_mode: "HTML" });
    }
};

bot.on('callback_query', (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = String(callbackQuery.from.id);

    if (action === 'add_time' && isAdmin(userId)) {
        bot.sendMessage(chatId, "<b><i>الرجاء إدخال ايدي 🆔 المستخدم لإضافة الوقت:</i></b>", { parse_mode: "HTML" });
        bot.once('message', getUserIdHandler);
    } else if (action === 'add_user') {
        bot.sendMessage(chatId, "<b><i>الرجاء إدخال ايدي 🆔 المستخدم لإضافه للبوت:</i></b>", { parse_mode: "HTML" });
        bot.once('message', getUserIdHandler);
    } else if (action === 'remove_user' && isAdmin(userId)) {
        bot.sendMessage(chatId, "<b><i>الرجاء إدخال ايدي 🆔 المستخدم لإزالته:</i></b>", { parse_mode: "HTML" });
        bot.once('message', deleteUserHandler);
    } else if (action === 'send_phone_number') {
        bot.sendMessage(chatId, "<b>يرجى إرسال رقمك يوز لمواصلة العملية📨✅</b>", { parse_mode: "HTML" });
        bot.once('message', getMobileNumberHandler);
    } else if (action === 'refresh_access_token') {
        refreshAccessToken(chatId)
            .then(newAccessToken => {
                if (newAccessToken) {
                    bot.sendMessage(chatId, "<b>تم تحديث الانترنت بنجاج🎁✅/b>", { parse_mode: "HTML" });
                    applyMgmNumber(chatId);
                }
            });
    }
});

const getMobileNumberHandler = (msg) => {
    const chatId = msg.chat.id;
    const mobileNumber = msg.text;
    if (!userData[chatId]) userData[chatId] = {};
    userData[chatId].mobile_number = mobileNumber;
    saveUserData(userData);

    const url = "https://ibiza.ooredoo.dz/auth/realms/ibiza/protocol/openid-connect/token";
    const payload = new URLSearchParams({
        client_id: "ibiza-app",
        grant_type: "password",
        "mobile-number": mobileNumber,
        language: "AR"
    });

    axios.post(url, payload, { headers: { "Content-Type": "application/x-www-form-urlencoded" } })
        .then(response => {
            console.log(response.data);
            if (response.data.includes("ROOGY")) {
                bot.sendMessage(chatId, "<b>✅ تم إرسال رمز التحقق إلى جوالك. الرجاء إدخال رمز التحقق:</b>", { parse_mode: "HTML" });
                bot.once('message', (msg) => verifyOtpHandler(msg, chatId, mobileNumber));
            } else {
                bot.sendMessage(chatId, "<b>❌ فشل في إرسال رمز التحقق. الرجاء المحاولة مرة أخرى.</b>", { parse_mode: "HTML" });
            }
        })
        .catch(error => {
            if (error.response && error.response.status === 403) {
                bot.sendMessage(chatId, "<b>تم✅ ارسال رمز التحقق بنجاح💬📲ادخل الرمز:</b>", { parse_mode: "HTML" });
                bot.once('message', (msg) => verifyOtpHandler(msg, chatId, mobileNumber));
            } else {
                console.error(error);
                bot.sendMessage(chatId, "<b>❌ فشل في إرسال رمز التحقق. الرجاء المحاولة مرة أخرى.</b>", { parse_mode: "HTML" });
            }
        });
};

const verifyOtpHandler = (msg, chatId, mobileNumber) => {
    const otp = msg.text;
    const url = "https://ibiza.ooredoo.dz/auth/realms/ibiza/protocol/openid-connect/token";
    const payload = new URLSearchParams({
        client_id: "ibiza-app",
        grant_type: "password",
        "mobile-number": mobileNumber,
        language: "AR",
        otp
    });

    axios.post(url, payload, { headers: { "Content-Type": "application/x-www-form-urlencoded" } })
        .then(response => {
            console.log(response.data);
            const accessToken = response.data.access_token;
            const refreshToken = response.data.refresh_token;

            if (accessToken && refreshToken) {
                if (!userData[chatId]) userData[chatId] = {};
                userData[chatId].access_token = accessToken;
                userData[chatId].refresh_token = refreshToken;
                saveUserData(userData);
                fetchBundleBalance(accessToken)
                    .then(initialBundleBalance => {
                        sendBundleBalanceInfo(chatId, initialBundleBalance, true);
                        setTimeout(() => applyMgmNumber(chatId), 1500);
                    });
            } else {
                bot.sendMessage(chatId, "<b>❌ فشل التحقق من رمز.</b>", { parse_mode: "HTML" });
            }
        })
        .catch(error => {
            console.error(error);
            bot.sendMessage(chatId, "<b>❌ فشل التحقق من رمز.</b>", { parse_mode: "HTML" });
        });
};

const refreshAccessToken = (chatId) => {
    return new Promise((resolve) => {
        if (!userData[chatId] || !userData[chatId].refresh_token) {
            bot.sendMessage(chatId, "<b>❌ لم يتم العثور على refresh_token. يرجى إعادة التحقق.</b>", { parse_mode: "HTML" });
            resolve(null);
            return;
        }

        const refreshToken = userData[chatId].refresh_token;
        const payload = new URLSearchParams({
            client_id: "ibiza-app",
            grant_type: "refresh_token",
            refresh_token: refreshToken
        });

        axios.post(REFRESH_TOKEN_URL, payload, { headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "okhttp/4.9.3" } })
            .then(response => {
                console.log(response.data);
                const newAccessToken = response.data.access_token;
                const newRefreshToken = response.data.refresh_token;

                if (newAccessToken && newRefreshToken) {
                    userData[chatId].access_token = newAccessToken;
                    userData[chatId].refresh_token = newRefreshToken;
                    saveUserData(userData);
                    resolve(newAccessToken);
                } else {
                    bot.sendMessage(chatId, "<b>❌ فشل تحديث رمز الوصول. الرجاء إعادة المحاولة.</b>", { parse_mode: "HTML" });
                    resolve(null);
                }
            })
            .catch(error => {
                console.error(error);
                bot.sendMessage(chatId, "<b>❌ فشل تحديث رمز الوصول. الرجاء إعادة المحاولة.</b>", { parse_mode: "HTML" });
                resolve(null);
            });
    });
};

const applyMgmNumber = (chatId) => {
    refreshAccessToken(chatId).then(accessToken => {
        if (!accessToken) return;

        const invitedUserNumbers = Array.from({ length: 5 }, () => `05${Math.floor(Math.random() * 9000000000 + 1000000000)}`);
        let successMessageSent = false;

        const applyMgmMultipleTimes = (remainingAttempts) => {
            if (remainingAttempts <= 0) {
                bot.sendMessage(chatId, "", { parse_mode: "HTML" });
                return;
            }

            invitedUserNumbers.forEach((number) => {
                const payload = {
                    skipMgm: true,
                    mgmValue: "50",
                    referralCode: number
                };

                axios.post(ADD_MGM_DASHBOARD, payload, { headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json", "User-Agent": "okhttp/4.9.3" } })
                    .then(response => {
                        console.log(response.data);
                        if (response.status === 200 && !successMessageSent) {
                            const showWonPopup = response.data.showWonPopUp || false;
                            if (showWonPopup) {
                                bot.sendMessage(chatId, `<b><i>✅ تم ارسال الانترنت بنجاح!</i></b>\n<strong><i>مطور البوت :</i></strong> <strong><a href="https://t.me/aziz_plug"> AZIZ </a></strong>\n<i><strong>قناة المطور :</strong></i> <strong><a href="https://t.me/groupbotaziz">Aziz groupe</a></strong>`, { parse_mode: "HTML" });
                                successMessageSent = true;
                            }
                        } else {
                            applyMgmMultipleTimes(remainingAttempts - 100);
                        }
                        if (successMessageSent) {
                            fetchBundleBalance(accessToken)
                                .then(updatedBundleBalance => sendBundleBalanceInfo(chatId, updatedBundleBalance, false));
                        }
                    })
                    .catch(error => console.error(error));
            });
        };

        applyMgmMultipleTimes(10); // Try up to 10 times to exceed the limit
    });
};

const fetchBundleBalance = (accessToken) => {
    return axios.get(GET_USER_BUNDLE_BALANCE, { headers: { "Authorization": `Bearer ${accessToken}`, "User-Agent": "okhttp/4.9.3" } })
        .then(response => {
            console.log(response.data);
            const bundleBalance = response.data;
            const account = bundleBalance.accounts.find(account => account.accountName === 'BonusDataMGMAccountID');
            return account ? [account.value, account.validation] : [null, null];
        })
        .catch(error => {
            console.error(error);
            return [null, null];
        });
};

const sendBundleBalanceInfo = (chatId, bundleBalanceInfo, beforeApply) => {
    const [value, validation] = bundleBalanceInfo;
    const message = beforeApply ? `<b>🎉لقد تم تسجيلك بنجاح وحصلت على مكافئتك،🎉</b>\n<b>رصيد التكفل المهدى قبل العملية🌐: </b> <i>${value}</i>\n<b>📊التاريخ الصلاحية: </b> <i>${validation}</i> `
                                : `<b>🎉لقد تم تسجيلك بنجاح وحصلت على مكافئتك،🎉</b>\n<b>رصيد التكفل المهدى بعد العملية🌐: </b> <i>${value}</i>\n<b>📊التاريخ الصلاحية: </b> <i>${validation}</i> `;
    bot.sendMessage(chatId, message, { parse_mode: "HTML" });
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    const userName = msg.from.username;

    if (userData[userId]) {
        if (!userData[userId].expiration_date) {
            bot.sendMessage(chatId, "<b>❌ لا يوجد تاريخ انتهاء صلاحية لهذا المستخدم.</b>", { parse_mode: "HTML" });
            return;
        }

        const expirationDate = moment(userData[userId].expiration_date, "YYYY-MM-DD HH:mm:ss");
        if (expirationDate.isAfter(moment())) {
            const timeLeft = moment.duration(expirationDate.diff(moment()));
            const days = timeLeft.days();
            const hours = timeLeft.hours();
            const minutes = timeLeft.minutes();
            sendWelcomeMessage(chatId, userName, days, hours, minutes);
        } else {
            sendNotificationMessage(chatId, userName);
        }
    } else {
        sendNotificationMessage(chatId, userName);
    }
});

console.log("تم بدء البوت بنجاح!✅");
console.log("start bot aziz 🟢💀");
