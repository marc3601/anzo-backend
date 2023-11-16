const Auction = require("../database/schemas/auctionSchema");
const deleteURLsAndKeepIDs = require("../functions/deleteURLsAndKeepIDs");
const deleteManyImages = require("../functions/deleteManyImages");
const { deleteFiles } = require("../s3");
const editAuction = async (req, res) => {
  const action = req.query.action;
  const id = req.query.id;
  if (action === "delete" && id) {
    const ids = [];
    Auction.findOneAndDelete({ _id: id }, (err, doc) => {
      if (err) {
        res.send("Wystąpił błąd");
      } else {
        // get image ids from urls
        doc.image.forEach((item) => {
          ids.push(deleteURLsAndKeepIDs(item.url));
        });
        // delete images in s3 bucket
        deleteManyImages(deleteFiles, ids)
          .then(() => {
            res.send("Ogłoszenie zostało usunięte.");
          })
          .catch((error) => {
            console.error("Error deleting files:", error);
            res.sendStatus(500);
          });
      }
    });
  } else if (action === "edit" && id) {
    const idsLeft = req.body.image.map((item) => item._id);
    const update = req.body;
    Auction.findOneAndUpdate(
      { _id: id },
      update,
      { returnOriginal: true, useFindAndModify: false },
      (err, doc) => {
        if (err) {
          res.send("Wystąpił błąd");
        } else {
          const idsAll = doc.image.map((item) => String(item._id));
          const idsToDelete = idsAll.filter((item) => !idsLeft.includes(item));
          const imagesToDelete = doc.image.filter((item) =>
            idsToDelete.includes(item._id)
          );
          const urlsToDelete = imagesToDelete.map((item) =>
            deleteURLsAndKeepIDs(item.url)
          );
          if (urlsToDelete.length > 0) {
            deleteManyImages(deleteFiles, urlsToDelete)
              .then(() => {
                res.send("Zmiany zostały zapisane.");
              })
              .catch((error) => {
                console.error("Error deleting files:", error);
                res.sendStatus(500);
              });
          } else {
            res.send("Zmiany zostały zapisane");
          }
        }
      }
    );
  } else {
    res.send("Unknown");
  }
};

module.exports = editAuction;
