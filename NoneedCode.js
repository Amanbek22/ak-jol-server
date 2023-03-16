



    //   const half_expressData = [];
    //   const expressData = await db
    //     .collection("transports")
    //     .where("type", "==", "half_express")
    //     .where("fromId", "==", tour.from.id)
    //     .where("miniStops", "array-contains", tour.to)
    //     .get();
    //   expressData.forEach((doc) => {
    //     const s = doc.data().stops.find((el) => el.id === tour.to.id);
    //     half_expressData.push({
    //       transportId: doc.id,
    //       ...doc.data(),
    //       price: s?.price || tour.price,
    //     });
    //   });


    
      // // half_expressData
      // // data
      // // orderData

      // if (half_expressData.length) {
      //   if (!data.length) {
      //     data = half_expressData;
      //   } else if (data.length) {
      //     data = [...data, ...half_expressData];
      //   }
      // }