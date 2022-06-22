const Product = Parse.Object.extend("Product");
const Category = Parse.Object.extend("Category");

Parse.Cloud.define("get-product-list", async (req) => {
  const queryProducts = new Parse.Query(Product);

  //condicoes da query

  if (req.params.title != null) {
    queryProducts.fullText("title", req.params.title);

    //queryProducts.matches("title", ".*" + req.params.title + ".*");
  }

  if (req.params.categoryId != null) {
    const category = new Category();
    category.id = req.params.categoryId;
    queryProducts.equalTo("category", category);
  }

  const itemsPerPage = req.params.itemsPerPage || 10;
  if (itemsPerPage > 100) throw "Quantidade inválida de itens por página";

  queryProducts.skip(itemsPerPage * req.params.page || 0);
  queryProducts.limit(itemsPerPage);
  queryProducts.include("category");

  const resultProducts = await queryProducts.find({ useMasterKey: true });

  return resultProducts.map(function (item) {
    item = item.toJSON();
    return formatProduct(item);
  });
});

Parse.Cloud.define("get-category-list", async (req) => {
  const queryCategory = new Parse.Query(Category);

  const resultCategories = await queryCategory.find({ useMasterKey: true });

  return resultCategories.map(function (c) {
    c = c.toJSON();

    return {
      id: c.objectId,
      title: c.title,
    };
  });
});

function formatProduct(productJson) {
  return {
    id: productJson.objectId,
    title: productJson.title,
    description: productJson.description,
    price: productJson.price,
    unit: productJson.unit,
    picture: productJson.picture != null ? productJson.picture.url : null,
    category: {
      id: productJson.category.objectId,
      title: productJson.category.title,
    },
  };
}

module.exports = { formatProduct };
