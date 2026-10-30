// MongoDB Seeding Script for Mongox Local Testing
db = db.getSiblingDB('test_db');

print('Seeding database: test_db...');

// 1. Customers Collection
const customers = [];
for (let i = 1; i <= 100; i++) {
  customers.push({
    name: `Customer ${i}`,
    email: `customer${i}@example.com`,
    phone: `+84-90${String(i).padStart(7, '0')}`,
    balance: Math.round(Math.random() * 100000) / 100,
    status: i % 5 === 0 ? 'inactive' : 'active',
    createdAt: new Date(Date.now() - i * 86400000)
  });
}
db.customers.insertMany(customers);
db.customers.createIndex({ email: 1 }, { unique: true });
db.customers.createIndex({ status: 1 });
print(`Inserted ${customers.length} customers.`);

// 2. Products Collection
const categories = ['Electronics', 'Home & Kitchen', 'Apparel', 'Books', 'Automotive'];
const products = [];
for (let i = 1; i <= 50; i++) {
  products.push({
    sku: `SKU-${String(i).padStart(4, '0')}`,
    title: `Product Title ${i}`,
    category: categories[i % categories.length],
    price: (i * 12.5).toFixed(2),
    stock: i * 15,
    tags: ['featured', categories[i % categories.length].toLowerCase()],
    updatedAt: new Date()
  });
}
db.products.insertMany(products);
db.products.createIndex({ sku: 1 }, { unique: true });
db.products.createIndex({ category: 1, price: 1 });
print(`Inserted ${products.length} products.`);

// 3. Orders Collection
const statuses = ['pending', 'shipped', 'delivered', 'cancelled'];
const orders = [];
for (let i = 1; i <= 500; i++) {
  orders.push({
    orderNumber: `ORD-${20260000 + i}`,
    customerId: `customer_${(i % 100) + 1}`,
    total: Math.round(Math.random() * 50000) / 100,
    status: statuses[i % statuses.length],
    itemsCount: (i % 6) + 1,
    createdAt: new Date(Date.now() - (i % 30) * 86400000)
  });
}
db.orders.insertMany(orders);
db.orders.createIndex({ orderNumber: 1 }, { unique: true });
db.orders.createIndex({ status: 1, createdAt: -1 });
print(`Inserted ${orders.length} orders.`);

// 4. Large Dataset Collection for Performance & Virtualization Testing (5,000 records)
print('Generating large dataset for virtualization and smooth scrolling tests (5,000 documents)...');
const largeDocs = [];
for (let i = 1; i <= 5000; i++) {
  largeDocs.push({
    index: i,
    guid: `guid-${i}-${Math.random().toString(36).substring(2, 9)}`,
    isActive: i % 2 === 0,
    balance: `$${(Math.random() * 10000).toFixed(2)}`,
    age: 20 + (i % 50),
    name: `User Record ${i}`,
    company: `Company ${i % 100}`,
    email: `record${i}@company${i % 100}.io`,
    tags: [`tag_${i % 10}`, `group_${i % 5}`],
    registeredAt: new Date(Date.now() - (i % 365) * 86400000)
  });
}
db.large_dataset.insertMany(largeDocs);
db.large_dataset.createIndex({ index: 1 });
db.large_dataset.createIndex({ company: 1 });
print(`Inserted ${largeDocs.length} large dataset documents.`);

print('Database test_db successfully seeded!');
