const db = require("../models");

async function gloablInclude(MODEL, array_id, key, val) {
    const model = db[MODEL];

    // dynamic query with key value matching collection field
    const result = await model.findOne({
        [key]: val,
    });
    if (!result) return false;
    return array_id.includes(result._id.toString());
}



module.exports = {
    gloablInclude,
};
