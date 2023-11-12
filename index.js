require("dotenv").config({ path: "./assets/.env" });
const TelegramBotApi = require("node-telegram-bot-api");
const bot = new TelegramBotApi(process.env.TOKEN, { polling: true });
const fs = require("fs");

const users = require("./assets/data/users.json");
const { saveReceipt } = require("./assets/modules/utils");
const commands = JSON.parse(fs.readFileSync("./assets/data/commands.json"));

bot.setMyCommands(commands);

bot.on("message", (msg) => {
  const command = msg.text;
  const chatId = msg.chat.id;
  var user = users.filter((x) => x.id === msg.from.id)[0];

  if (!user) {
    users.push({
      id: msg.from.id,
      nick: msg.from.username,
      name: msg.from.first_name,
      isHavePremium: false,
      dateBuyedPremium: null,
    });

    user = users.filter((x) => x.id === msg.from.id)[0];
    fs.writeFileSync(
      "./assets/data/users.json",
      JSON.stringify(users, null, "\t")
    );
  }

  if (msg.chat.type === "private") {
    switch (command) {
      case "/start":
        const startMessage = `
        ЧТОБЫ ИЗБЕЖАТЬ МОШЕННИЧЕСТВА И НЕЗАКОННЫЕ ТЕМЫ, МЫ ЗАПУСТИЛИ ПЛАТНУЮ РЕКЛАМУ\n\nБОТ ОПЛАТЫ, ПРЕДОСТАВЛЯЮЩИЙ ДОСТУП К РАЗМЕЩЕНИЮ РЕКЛАМЫ В НАШЕМ ЧАТЕ @ELI_TA_BOT\n\nСТОИМОСТЬ РЕКЛАМЫ: 30 ДНЕЙ - 500 ₽\n\nПОСЛЕ ОПЛАТЫ РЕКЛАМЫ, ВЫ МОЖЕТЕ В СВОБОДНОМ ДОСТУПЕ ПУБЛИКОВАТЬ СВОИ ПОСТЫ В ТЕЧЕНИИ 30 СУТОК.`;

        bot.sendMessage(chatId, startMessage, {
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [{ text: "Подтвердить оплату", callback_data: `paymentSuccess` }],
              [
                {
                  text: "Инструкция по пользованию и оплате",
                  callback_data: `instruction`,
                },
              ],
              [{ text: "Обратная связь", callback_data: `feedback` }],
            ],
          }),
        });
        break;

      default:
        break;
    }
  } else if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
    if (!user.isHavePremium) {
      bot.sendMessage(
        chatId,
        `Здравствуйте, @${user.nick} !\nДля подачи объявления в группу переходите по ссылке:\n${process.env.REQUISITES_BOT}`
      );
      bot.deleteMessage(chatId, msg.message_id);
    }
  }
});

const handleDocumentSend = (msg) => {
  saveReceipt(msg, bot);
  bot.removeListener("document", handleDocumentSend);
};

function checkPaymentStatus(query) {
  if (query.includes("cancelPaymentId:")) {
    const paymentId = query.split(":")[1];

    const userWithPaymentId = users.find((x) => x.id === Number(paymentId));

    if (userWithPaymentId) {
      userWithPaymentId.isHavePremium = false;
      userWithPaymentId.dateBuyedPremium = null;

      fs.writeFileSync(
        "./assets/data/users.json",
        JSON.stringify(users, null, "\t")
      );

      bot.sendMessage(
        userWithPaymentId.id,
        `Подписка отклонена!\nЕсли это ошибка свяжитесь с поддержкой ${process.env.REQUISITES_TELEGRAM}`
      );

      bot.sendMessage(
        process.env.ADMIN_ID,
        `Вы успешно отклонили оплату для ${userWithPaymentId.name}!\nПользователю был отправлен ответ`
      );
    }
  } else if (query.includes("confirmPaymentId:")) {
    const paymentId = query.split(":")[1];

    const userWithPaymentId = users.find((x) => x.id === Number(paymentId));

    if (userWithPaymentId) {
      const currentDate = new Date();
      userWithPaymentId.isHavePremium = true;
      userWithPaymentId.dateBuyedPremium = currentDate;

      fs.writeFileSync(
        "./assets/data/users.json",
        JSON.stringify(users, null, "\t")
      );

      bot.sendMessage(
        userWithPaymentId.id,
        `Подписка проверена и оплачена! Срок действия 30 дней.\nДата покупки ${currentDate}`
      );

      bot.sendMessage(
        process.env.ADMIN_ID,
        `Вы успешно приняли оплату для ${userWithPaymentId.name}!\nПользователю была направлена инструкция\n\nДата покупки: ${currentDate}`
      );
    }
  }
}

bot.on("callback_query", (msg) => {
  const chatId = msg.from.id;
  const query = msg.data;
  const user = users.filter((x) => x.id === chatId)[0];

  switch (query) {
    case "feedback":
      bot.sendMessage(chatId, `Связь: ${process.env.REQUISITES_TELEGRAM}`);
      break;

    case "instruction":
      const instructionText = `Уважаемый(ая) ${user.name}, размещение объявлений в группе теперь условно платное.\n\nДобавляйте посты прямо в этот чат, если есть доступ. Объявления пересылаются в группу автоматически при наличии доступа.\n\nСтоимость доступа: 1 месяц - 500 ₽\n\n✅ Совершайте оплату через\n📁 Банковскую карту\n🔘 5536914087493080\nℹ️ Проверочная информация: (Рушана Н)\n\nДалее скопируйте или скачайте чек, в личном кабинете нажмите кнопку "Подтвердить оплату" и отправьте в виде текста или файла. Вам сразу будет дан временный доступ до окончания проверки.\n\nПри возникновении затруднений просто отправьте произвольный текст, и с вами свяжется администратор группы: @podderzhkachata\n\nЕсли вы оплатили доступ и при этом шлете объявления сомнительного характера (поиск курьеров для торговли наркотиками или откровенный спам (связки, арбитраж), то ваш аккаунт блокируется без возврата денежных средств.`;
      bot.sendMessage(chatId, instructionText, {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: "Подтвердить оплату", callback_data: `paymentSuccess` }],
          ],
        }),
      });
      break;

    case "paymentSuccess":
      const paymentSuccessText = `Отправьте квитанцию об оплате в виде текста или pdf-файла\n\nПри возникновении затруднений просто отправьте произвольный текст, и с вами свяжется администратор группы: @podderzhkachata`;

      bot.sendMessage(chatId, paymentSuccessText);
      bot.on("document", handleDocumentSend);

      break;

    default:
      checkPaymentStatus(query);

      break;
  }
});

setInterval(() => {
  const currentDate = new Date();

  for (const user of users) {
    if (user.isHavePremium && user.dateBuyedPremium) {
      const endDate = new Date(user.dateBuyedPremium);
      endDate.setMonth(endDate.getMonth() + 1);

      if (currentDate >= endDate) {
        user.dateBuyedPremium = null;
        user.isHavePremium = false;

        bot.sendMessage(user.id, `Пользователь ${user.name}: Премиум истек.`);
        bot.sendMessage(
          process.env.ADMIN_ID,
          `У пользователя @${user.nick}: Премиум истек.`
        );

        fs.writeFileSync(
          "./assets/data/users.json",
          JSON.stringify(users, null, "\t")
        );
      }
    }
  }
}, 5000);

bot.on("polling_error", console.log);
