const Order = Parse.Object.extend("Order");
const CartItem = Parse.Object.extend("CartItem");
const OrderItem = Parse.Object.extend("OrderItem");
const product = require("./product");

Parse.Cloud.define("checkout", async (req) => {
  if (req.user === null) throw "INVALID_USER";

  const queryCartItems = new Parse.Query(CartItem);
  queryCartItems.equalTo("user", req.user);
  queryCartItems.include("product");
  const resultCartItems = await queryCartItems.find({ useMasterKey: true });

  let total = 0;
  for (let item of resultCartItems) {
    item = item.toJSON();
    total += item.quantity * item.product.price;
  }

  if (req.params.total != total) throw "INVALID_TOTAL";

  //salvando a ordem do Pedido
  const order = new Order();
  order.set("total", total);
  order.set("user", req.user);
  const savedOrder = await order.save(null, { useMasterKey: true });

  //Salvando os item do Pedido
  for (let item of resultCartItems) {
    const orderItem = new OrderItem();
    orderItem.set("order", savedOrder);
    orderItem.set("user", req.user);
    orderItem.set("product", item.get("product"));
    orderItem.set("quantity", item.get("quantity"));
    orderItem.set("price", item.toJSON().product.price);
    await orderItem.save(null, { useMasterKey: true });
  }
  //Removendo Pedidos
  await Parse.Object.destroyAll(resultCartItems, { useMasterKey: true });

  return {
    id: savedOrder.id,
  };
});

Parse.Cloud.define("get-orders", async (req) => {
  if (req.user === null) throw "INVALID_USER";

  const queryOrders = new Parse.Query(Order);
  queryOrders.equalTo("user", req.user);
  const resultOrders = await queryOrders.find({ useMasterKey: true });
  return resultOrders.map((result) => {
    result = result.toJSON();
    return {
      id: result.objectId,
      total: result.total,
      createdAt: result.createdAt,
    };
  });
});

Parse.Cloud.define("get-orders-items", async (req) => {
  if (req.user === null) throw "INVALID_USER";
  if (req.params.orderId === null) throw "INVALID_ORDER";

  const order = new Order();
  order.id = req.params.orderId;

  const queryOrdersItems = new Parse.Query(OrderItem);
  queryOrdersItems.equalTo("order", order);
  queryOrdersItems.equalTo("user", req.user);
  queryOrdersItems.include("product");
  queryOrdersItems.include("product.category");

  const resultOrdersItems = await queryOrdersItems.find({ useMasterKey: true });

  return resultOrdersItems.map((o) => {
    o = o.toJSON();
    return {
      id: o.objectId,
      product: product.formatProduct(o.product),
      quantity: o.quantity,
      price: o.price,
    };
  });
});
