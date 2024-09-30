const db = require("../models");
const mongoose = require("mongoose");
require("dotenv").config();
const Neuralmap = db.neuralmap;
const Nodemap = db.nodemap;
const Linkmap = db.linkmap;
const User = db.user;

exports.slugToId = async (req, res) => {
  const slug = req.params.slug;

  const map = await Neuralmap.findOne({ slug: slug });

  if (!map) {
    return res.status(404).send({
      message: "Mao not found",
    });
  }

  res.send({
    id: map._id,
  });
};

exports.createNeuralmap = async (req, res) => {
  const userId = req.userId;

  // Validate request
  if (!req.body.name) {
    res.status(400).send({ message: "Name can not be empty!" });
    return;
  }

  const name = req.body.name;
  const slug = name.toLowerCase().replace(/ /g, "-");

  //  check if the neuralmap already exists
  const neuralmap = await Neuralmap.findOne({ name: name });

  if (neuralmap) {
    return res.status(400).send({
      message: "Neuralmap already exists",
    });
  }

  // Create a Neuralmap
  let map = new Neuralmap({
    slug: slug,
    name: name,
    authors: [userId, ...req.body.collabs],
  });

  // Save Neuralmap in the database
  await map.save();

  map = await Neuralmap.findOne({ name: name }).populate("authors");

  res.status(200).send({
    id: map._id,
    name: map.name,
    slug: map.slug,
    authors: map.authors,
  });
};

exports.createNode = async (req, res) => {
  // Validate request
  if (!req.body.name) {
    res.status(400).send({ message: "Name can not be empty!" });
    return;
  }

  const id = req.params.id;
  const name = req.body.name;

  const neuralMap = await Neuralmap.findById(id);

  if (!neuralMap) {
    return res.status(404).send({
      message: "Neuralmap not found",
    });
  }

  // Create a Node
  const node = new Nodemap({
    name: name,
  });

  // Save Node in the database
  await node.save();

  neuralMap.nodes.push(node._id);

  await neuralMap.save();

  res.status(200).send({
    mapId: neuralMap._id,
    id: node._id,
    name: node.name,
  });
};

exports.createLink = async (req, res) => {
  // Validate request
  if (!req.body.source || !req.body.target) {
    res.status(400).send({ message: "Source and Target can not be empty!" });
    return;
  }

  const id = req.params.id;

  const source = req.body.source;
  const label = req.body.label;
  const target = req.body.target;

  const neuralMap = await Neuralmap.findById(id);

  if (!neuralMap) {
    return res.status(404).send({
      message: "Neuralmap not found",
    });
  }

  // Create a Link
  const link = new Linkmap({
    source: source,
    label: label,
    target: target,
  });

  // Save Link in the database
  await link.save();

  neuralMap.links.push(link._id);

  await neuralMap.save();

  res.status(200).send({
    mapId: neuralMap._id,
    id: link._id,
    source: link.source,
    label: link.label,
    target: link.target,
  });
};

exports.createNodes = async (req, res) => {
  // Validate request
  if (!req.body.names) {
    res.status(400).send({ message: "Names can not be empty!" });
    return;
  }

  const id = req.params.id;
  const names = req.body.names;

  const neuralMap = await Neuralmap.findById(id);

  if (!neuralMap) {
    return res.status(404).send({
      message: "Neuralmap not found",
    });
  }

  const nodes = [];

  for (let i = 0; i < names.length; i++) {
    let nodemap;

    // Create a Node
    nodemap = new Nodemap({
      name: names[i],
    });

    // Save Node in the database
    await nodemap.save();
    nodes.push({
      id: nodemap._id,
      name: nodemap.name,
    });

    neuralMap.nodes.push(nodemap._id);

    await neuralMap.save();
  }

  res.status(200).send({
    mapId: neuralMap._id,
    nodes,
  });
};

exports.createLinks = async (req, res) => {
  // Validate request
  if (!req.body.links) {
    res.status(400).send({ message: "Links can not be empty!" });
    return;
  }

  const id = req.params.id;
  const links = req.body.links;

  const neuralMap = await Neuralmap.findById(id);

  if (!neuralMap) {
    return res.status(404).send({
      message: "Neuralmap not found",
    });
  }

  const linkmaps = [];

  for (let i = 0; i < links.length; i++) {
    let linkmap;

    // Create a Link
    linkmap = new Linkmap({
      source: links[i].source,
      label: links[i].label,
      target: links[i].target,
    });

    // Save Link in the database
    await linkmap.save();

    linkmaps.push({
      id: linkmap._id,
      source: linkmap.source,
      label: linkmap.label,
      target: linkmap.targetƒ,
    });

    neuralMap.links.push(linkmap._id);

    await neuralMap.save();
  }

  res.status(200).send({
    mapId: neuralMap._id,
    linkmaps,
  });
};

exports.updateNode = async (req, res) => {
  if (!req.body.name) {
    res.status(400).send({ message: "Name can not be empty!" });
    return;
  }

  const id = req.params.id;

  const nodemap = await Nodemap.findById(id);

  if (!nodemap) {
    return res.status(404).send({
      message: "Node not found",
    });
  }

  nodemap.name = req.body.name;
  await nodemap.save();

  res.status(200).send({
    id: nodemap._id,
    name: nodemap.name,
  });
};

exports.updateLink = async (req, res) => {
  if (!req.body.source || !req.body.target) {
    res.status(400).send({ message: "Source and Target can not be empty!" });
    return;
  }
  const id = req.params.id;

  const source = req.body.source;
  const label = req.body.label;
  const target = req.body.target;

  const linkmap = await Linkmap.findById(id);

  if (!linkmap) {
    return res.status(404).send({
      message: "Link not found",
    });
  }

  linkmap.source = source;
  linkmap.label = label;
  linkmap.target = target;
  await linkmap.save();

  res.status(200).send({
    id: linkmap._id,
    source: linkmap.source,
    label: linkmap.label,
    target: linkmap.target,
  });
};

exports.deleteNode = async (req, res) => {
  const id = req.params.id;

  const nodemap = await Nodemap.findByIdAndRemove(id);

  if (!nodemap) {
    return res.status(404).send({
      message: "Node not found",
    });
  }

  res.status(200).send({
    message: "Node deleted successfully!",
  });
};

exports.deleteLink = async (req, res) => {
  const id = req.params.id;

  const linkmap = await Linkmap.findByIdAndRemove(id);

  if (!linkmap) {
    return res.status(404).send({
      message: "Link not found",
    });
  }

  res.status(200).send({
    message: "Link deleted successfully!",
  });
};

exports.getMapNames = async (req, res) => {
  const maps = await Neuralmap.find();

  const mapNames = maps.map((map) => {
    return {
      id: map._id,
      name: map.name,
      slug: map.slug,
    };
  });

  res.status(200).send({
    mapNames,
  });
};

exports.getNeuralMaps = async (req, res) => {
  const maps = await Neuralmap.find().populate("authors");

  const neuralMaps = maps.map((map) => {
    return {
      id: map._id,
      name: map.name,
      slug: map.slug,
      authors: map.authors,
    };
  });

  res.status(200).send({
    neuralMaps,
  });
};

exports.getNeuralMap = async (req, res) => {
  const id = req.params.id;

  const map = await Neuralmap.findById(id)
    .populate("authors")
    .populate("nodes")
    .populate("links");

  if (!map) {
    return res.status(404).send({
      message: "Map not found",
    });
  }

  // convert nodes array to format: node.name: {id: '', name: node.name}
    const _nodes = {};
    map.nodes.forEach((node) => {
        _nodes[node.name] = {
            id: node._id,
            name: node.name,
        };
    });



  res.status(200).send({
    id: map._id,
    name: map.name,
    slug: map.slug,
    authors: map.authors,
    nodes: _nodes,
    links: map.links,
  });
};

exports.fetchNodes = async (req, res) => {
  const nodemap = await Nodemap.find();

  res.status(200).send({
    nodemap,
  });
};

exports.fetchNodesByMap = async (req, res) => {
  const id = req.params.id;

  const map = await Neuralmap.findById(id).populate("nodes");

  if (!map) {
    return res.status(404).send({
      message: "Map not found",
    });
  }

  res.status(200).send({
    nodes: map.nodes,
  });
};

exports.fetchLinks = async (req, res) => {
  const linkmap = await Linkmap.find();

  res.status(200).send({
    linkmap,
  });
};
