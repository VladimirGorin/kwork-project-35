const fs = require("fs");

function saveReceipt(msg, bot) {
  const chatId = msg.chat.id;
  const users = JSON.parse(fs.readFileSync("./assets/data/users.json"));

  if (msg.document) {
    const fileId = msg.document.file_id;
    const user = users.find((x) => x.id === chatId);

    if (!user) {
      console.error("User not found");
      return;
    }

    const filePath = `./assets/data/files/${msg.document.file_name}`;
    const fileStream = fs.createWriteStream(filePath);

    bot.getFileStream(fileId).pipe(fileStream);

    fileStream.on("error", (error) => {
      console.error(`Error downloading file: ${error}`);
    });

    fileStream.on("finish", () => {
      bot.sendMessage(
        chatId,
        `Информация о платеже принята и направлена администратору группы\nОжидайте проверки платежа.`
      );

      const adminChatId = process.env.ADMIN_ID;

      if (adminChatId) {
        bot.sendDocument(adminChatId, filePath, {
          caption: `Платеж от @${user.nick}`,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Подтвердить платеж",
                  callback_data: `confirmPaymentId:${user.id}`,
                },
              ],
              [
                {
                  text: "Отклонить платеж",
                  callback_data: `cancelPaymentId:${user.id}`,
                },
              ],
            ],
          },
        });
      } else {
        console.error("Admin chat ID not configured");
      }
    });
  } else if (msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const user = users.find((x) => x.id === chatId);

    if (!user) {
      console.error("User not found");
      return;
    }

    const filePath = `./assets/data/files/${fileId}.jpg`;
    const fileStream = fs.createWriteStream(filePath);

    bot.getFileStream(fileId).pipe(fileStream);

    fileStream.on("error", (error) => {
      console.error(`Error downloading file: ${error}`);
    });


    fileStream.on("finish", () => {
      bot.sendMessage(
        chatId,
        `Информация о платеже принята и направлена администратору группы\nОжидайте проверки платежа.`
      );

      const adminChatId = process.env.ADMIN_ID;

      if (adminChatId) {
        bot.sendPhoto(adminChatId, filePath, {
          caption: `Платеж от @${user.nick}`,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Подтвердить платеж",
                  callback_data: `confirmPaymentId:${user.id}`,
                },
              ],
              [
                {
                  text: "Отклонить платеж",
                  callback_data: `cancelPaymentId:${user.id}`,
                },
              ],
            ],
          },
        });
      } else {
        console.error("Admin chat ID not configured");
      }
    });
  }
}

module.exports = {
  saveReceipt,
};
