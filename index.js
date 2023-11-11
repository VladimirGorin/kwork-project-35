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
        const startMessage = `Уважаемый(ая) ${
          user.name
        }, размещение объявлений в группе теперь условно платное.\nПлата берется с целью поддержания порядка в чате и защиты от мошенничества.\nЭто единственная возможность и в дальнейшем поддерживать проект.\nДобавляйте посты прямо в этот чат или в группу, если есть доступ. Объявления пересылаются в группу автоматически при наличии доступа.\nСтоимость доступа: 1 месяц - 500 ₽\n✅ Совершайте оплату через\n2. 📁 Банковскую карту\n7. 🔘 ${
          process.env.REQUISITES_PHONENUMBER
        }\nℹ️ Проверочная информация:\n(${
          process.env.REQUISITES_FULLNAME
        })\nДалее скопируйте или скачайте чек, в личном кабинете нажмите кнопку "Подтвердить оплату" и отправьте в виде текста или файла.\nВам сразу будет дан временный доступ до окончания проверки.\nПри возникновении затруднений просто отправьте произвольный текст, и с вами свяжется администратор группы: ${
          process.env.REQUISITES_TELEGRAM
        }\nЕсли вы оплатили доступ и при этом шлете объявления сомнительного характера (поиск курьеров для торговли наркотиками или откровенный спам (связки, арбитраж), то ваш аккаунт блокируется без возврата денежных средств.\nОтправьте квитанцию об оплате в виде текста или pdf-файла\n\nДоступ к показу объявлений будет дан сразу, а затем подтвержден после проверки платежа\n\nПри возникновении затруднений просто отправьте произвольный текст, и с вами свяжется администратор группы: @podderzhkachata\n\nТеперь доступ к размещению объявлений в группе условно платный.\n\nПлата берется с целью поддержания порядка в чате и защиты от мошенничества.\n\nЕсли вы оплатили доступ и при этом шлете объявления сомнительного характера (поиск курьеров для торговли наркотиками или откровенный скам (связки, арбитраж), то ваш аккаунт блокируется без возврата денежных средств.\n\nСтоимость доступа: 1 месяц: 500 ₽.\n\nВ данный момент показ объявлений ${
          !user.isHavePremium ? "не оплачен" : "оплачен"
        }.\n\nОбъявления ${
          !user.isHavePremium ? "не" : ""
        } публикуются.\n\nПожалуйста, внесите оплату или получите временный доступ.\n\nПодробнее в "Инструкции по пользованию и оплате".`;

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
      const instructionText = `Уважаемый(ая) ${user.name}, размещение объявлений в группе теперь условно платное.\nПлата берется с целью поддержания порядка в чате и защиты от мошенничества.\nЭто единственная возможность и в дальнейшем поддерживать проект.\nДобавляйте посты прямо в этот чат или в группу, если есть доступ. Объявления пересылаются в группу автоматически при наличии доступа.\nСтоимость доступа: 1 месяц - 3 рубля.\n✅ Совершайте оплату через систему ЕРИП:\n2. 📁 Банковские финансовые услуги\n3. 📁 Банки, НКФО\n4. 📁 Банк БелВЭБ\n5. 📁 Пополнение счета\n7. 🔘 ${process.env.REQUISITES_PHONENUMBER}\nℹ️ Проверочная информация:\n(${process.env.REQUISITES_FULLNAME})\nДалее скопируйте или скачайте чек, в личном кабинете нажмите кнопку \"Подтвердить оплату\" и отправьте в виде текста или файла.\nВам сразу будет дан временный доступ до окончания проверки.\nПри возникновении затруднений просто отправьте произвольный текст, и с вами свяжется администратор группы: ${process.env.REQUISITES_TELEGRAM}\nЕсли вы оплатили доступ и при этом шлете объявления сомнительного характера (поиск курьеров для торговли наркотиками или откровенный спам (связки, арбитраж), то ваш аккаунт блокируется без возврата денежных средств.`;
      bot.sendMessage(chatId, instructionText, {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: "Подтвердить оплату", callback_data: `paymentSuccess` }],
          ],
        }),
      });
      break;

    case "paymentSuccess":
      const paymentSuccessText = `Отправьте квитанцию ЕРИП об оплате в виде текста или pdf-файла\nДоступ к показу объявлений будет дан сразу, а затем подтвержден после проверки платежа\nПри возникновении затруднений просто отправьте произвольный текст, и с вами свяжется администратор группы: ${process.env.REQUISITES_TELEGRAM}`;

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
