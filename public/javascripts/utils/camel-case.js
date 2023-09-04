function convert(row) {
  const replaced = {};
  
  Object.keys(row).forEach(key => {
    const camelCase = key.replace(/([-_][a-z])/gi, ($1) => $1.toUpperCase().replace("_", ""));
    replaced[camelCase] = row[key];
  })
  
  return replaced;
}

export default data => {
  if (Array.isArray(data)) {
    return data.map(row => convert(row));
  } else return convert(data);
}