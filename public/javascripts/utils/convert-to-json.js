export default data => {
  let json = {};

  let tagsArr = [];

  for (let [key, val] of data) {
    if (key === 'tags') tagsArr.push(val);
    else json[key] = val;
  }

  json['tags'] = !tagsArr.length ? null : tagsArr.join(',');
  
  return json;
}