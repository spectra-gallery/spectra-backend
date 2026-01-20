const db = require('../models');
const GenerativeSerie = db.generativeSerie;
const Serie = db.serie;
const Sketch = db.sketch;
const User = db.user;
const Chain = db.chain;
const fs = require('fs');
const path = require('path');

// Create a new generative series
exports.createGenerativeSerie = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      algorithm, 
      parameters, 
      seed, 
      palette, 
      style, 
      complexity, 
      iterations, 
      audioBased, 
      audioAlgorithm, 
      audioParameters, 
      chainId, 
      tokenStandard, 
      totalSupply, 
      price, 
      royalty, 
      sketchId, 
      artists
    } = req.body;

    // Validate required fields
    if (!name || !description || !algorithm) {
      return res.status(400).send({ 
        ok: false, 
        error: 'Name, description, and algorithm are required' 
      });
    }

    // Find the sketch if provided
    let sketch = null;
    if (sketchId) {
      sketch = await Sketch.findById(sketchId);
      if (!sketch) {
        return res.status(404).send({ 
          ok: false, 
          error: 'Sketch not found' 
        });
      }
    }

    // Find the chain if provided
    let chain = null;
    if (chainId) {
      chain = await Chain.findById(chainId);
      if (!chain) {
        return res.status(404).send({ 
          ok: false, 
          error: 'Chain not found' 
        });
      }
    }

    // Find artists
    let artistIds = [];
    if (artists && artists.length > 0) {
      artistIds = await User.find({ _id: { $in: artists } }).select('_id');
    }

    // Create the generative series
    const generativeSerie = new GenerativeSerie({
      name,
      description,
      algorithm,
      parameters: parameters || {},
      seed: seed || '',
      palette: palette || [],
      style: style || 'abstract',
      complexity: complexity || 5,
      iterations: iterations || 100,
      audioBased: audioBased || false,
      audioAlgorithm: audioAlgorithm || '',
      audioParameters: audioParameters || {},
      chain: chain ? chain._id : null,
      tokenStandard: tokenStandard || 'ERC721',
      totalSupply: totalSupply || 100,
      price: price || 0,
      royalty: royalty || 10,
      sketchId: sketch ? sketch._id : null,
      artists: artistIds,
      generativeMetadata: {
        algorithmVersion: '1.0',
        framework: 'custom',
        libraries: ['p5.js', 'tone.js'],
        renderingEngine: 'canvas',
        resolution: '1920x1080',
        fileFormat: 'png',
        deterministic: true,
        randomnessSource: 'Math.random'
      }
    });

    // Save the generative series
    const savedSerie = await generativeSerie.save();

    // Also create a regular serie for compatibility
    const regularSerie = new Serie({
      name,
      description,
      type: 'generative',
      image: req.body.image || '',
      sketch: sketch ? sketch._id : null,
      media: sketch ? sketch._id : null, // Use sketch as media for generative art
      chain: chain ? chain._id : null,
      artists: artistIds,
      generative: true,
      onChain: false,
      totalSupply: totalSupply || 100,
      price: price || 0,
      royalty: royalty || 10
    });

    await regularSerie.save();

    return res.status(201).send({ 
      ok: true, 
      generativeSerie: savedSerie, 
      serie: regularSerie 
    });
  } catch (error) {
    console.error('Error creating generative serie:', error);
    return res.status(500).send({ 
      ok: false, 
      error: error.message 
    });
  }
};

// Get all generative series
exports.getAllGenerativeSeries = async (req, res) => {
  try {
    const series = await GenerativeSerie.find()
      .populate('artists', 'username email')
      .populate('chain', 'name symbol')
      .populate('sketchId', 'name css javascript')
      .sort({ date: -1 });

    return res.status(200).send({ 
      ok: true, 
      series 
    });
  } catch (error) {
    return res.status(500).send({ 
      ok: false, 
      error: error.message 
    });
  }
};

// Get a single generative series by ID
exports.getGenerativeSerieById = async (req, res) => {
  try {
    const serie = await GenerativeSerie.findById(req.params.id)
      .populate('artists', 'username email')
      .populate('chain', 'name symbol')
      .populate('sketchId', 'name css javascript');

    if (!serie) {
      return res.status(404).send({ 
        ok: false, 
        error: 'Generative serie not found' 
      });
    }

    return res.status(200).send({ 
      ok: true, 
      serie 
    });
  } catch (error) {
    return res.status(500).send({ 
      ok: false, 
      error: error.message 
    });
  }
};

// Get generative series by slug
exports.getGenerativeSerieBySlug = async (req, res) => {
  try {
    const serie = await GenerativeSerie.findOne({ slug: req.params.slug })
      .populate('artists', 'username email')
      .populate('chain', 'name symbol')
      .populate('sketchId', 'name css javascript');

    if (!serie) {
      return res.status(404).send({ 
        ok: false, 
        error: 'Generative serie not found' 
      });
    }

    return res.status(200).send({ 
      ok: true, 
      serie 
    });
  } catch (error) {
    return res.status(500).send({ 
      ok: false, 
      error: error.message 
    });
  }
};

// Update a generative series
exports.updateGenerativeSerie = async (req, res) => {
  try {
    const serie = await GenerativeSerie.findById(req.params.id);
    
    if (!serie) {
      return res.status(404).send({ 
        ok: false, 
        error: 'Generative serie not found' 
      });
    }

    // Update fields
    if (req.body.name) serie.name = req.body.name;
    if (req.body.description) serie.description = req.body.description;
    if (req.body.algorithm) serie.algorithm = req.body.algorithm;
    if (req.body.parameters) serie.parameters = req.body.parameters;
    if (req.body.seed) serie.seed = req.body.seed;
    if (req.body.palette) serie.palette = req.body.palette;
    if (req.body.style) serie.style = req.body.style;
    if (req.body.complexity) serie.complexity = req.body.complexity;
    if (req.body.iterations) serie.iterations = req.body.iterations;
    if (req.body.audioBased) serie.audioBased = req.body.audioBased;
    if (req.body.audioAlgorithm) serie.audioAlgorithm = req.body.audioAlgorithm;
    if (req.body.audioParameters) serie.audioParameters = req.body.audioParameters;
    if (req.body.chainId) {
      const chain = await Chain.findById(req.body.chainId);
      if (chain) serie.chain = chain._id;
    }
    if (req.body.tokenStandard) serie.tokenStandard = req.body.tokenStandard;
    if (req.body.totalSupply) serie.totalSupply = req.body.totalSupply;
    if (req.body.price) serie.price = req.body.price;
    if (req.body.royalty) serie.royalty = req.body.royalty;
    if (req.body.sketchId) {
      const sketch = await Sketch.findById(req.body.sketchId);
      if (sketch) serie.sketchId = sketch._id;
    }
    if (req.body.status) serie.status = req.body.status;
    if (req.body.published) serie.published = req.body.published;
    
    serie.modified = new Date().toISOString();

    const updatedSerie = await serie.save();

    return res.status(200).send({ 
      ok: true, 
      serie: updatedSerie 
    });
  } catch (error) {
    return res.status(500).send({ 
      ok: false, 
      error: error.message 
    });
  }
};

// Delete a generative series
exports.deleteGenerativeSerie = async (req, res) => {
  try {
    const serie = await GenerativeSerie.findByIdAndDelete(req.params.id);
    
    if (!serie) {
      return res.status(404).send({ 
        ok: false, 
        error: 'Generative serie not found' 
      });
    }

    return res.status(200).send({ 
      ok: true, 
      message: 'Generative serie deleted successfully' 
    });
  } catch (error) {
    return res.status(500).send({ 
      ok: false, 
      error: error.message 
    });
  }
};

// Render a generative art piece from the series
exports.renderGenerativeArt = async (req, res) => {
  try {
    const { serieId, seed, iteration } = req.body;
    
    const serie = await GenerativeSerie.findById(serieId);
    
    if (!serie) {
      return res.status(404).send({ 
        ok: false, 
        error: 'Generative serie not found' 
      });
    }

    // If the series has a sketch, we can render it
    if (serie.sketchId) {
      const sketch = await Sketch.findById(serie.sketchId);
      
      if (!sketch) {
        return res.status(404).send({ 
          ok: false, 
          error: 'Sketch not found' 
        });
      }

      // Here you would typically:
      // 1. Set up a headless browser or rendering engine
      // 2. Load the sketch HTML/JS/CSS
      // 3. Inject the seed and parameters
      // 4. Capture the output
      // 5. Save the result
      
      // For now, we'll return a placeholder response
      return res.status(200).send({ 
        ok: true, 
        message: 'Generative art rendering would be implemented here',
        serieId: serie._id,
        seed: seed || serie.seed,
        iteration: iteration || 1,
        sketchId: sketch._id,
        status: 'rendering_placeholder'
      });
    } else {
      return res.status(400).send({ 
        ok: false, 
        error: 'No sketch associated with this generative serie' 
      });
    }
  } catch (error) {
    return res.status(500).send({ 
      ok: false, 
      error: error.message 
    });
  }
};

// Mint a generative art piece as NFT
exports.mintGenerativeArt = async (req, res) => {
  try {
    const { serieId, tokenId, receiverAddress } = req.body;
    
    const serie = await GenerativeSerie.findById(serieId);
    
    if (!serie) {
      return res.status(404).send({ 
        ok: false, 
        error: 'Generative serie not found' 
      });
    }

    if (serie.supply >= serie.totalSupply) {
      return res.status(400).send({ 
        ok: false, 
        error: 'Maximum supply reached' 
      });
    }

    // Here you would typically:
    // 1. Generate the specific art piece for this tokenId
    // 2. Upload metadata to IPFS/Arweave
    // 3. Mint the NFT on the appropriate blockchain
    // 4. Update the series supply
    
    // For now, we'll simulate this
    serie.supply += 1;
    serie.lastRendered = new Date().toISOString();
    serie.renderCount += 1;
    
    await serie.save();

    return res.status(200).send({ 
      ok: true, 
      message: 'Generative art minting would be implemented here',
      serieId: serie._id,
      tokenId: tokenId || serie.supply,
      receiverAddress: receiverAddress || '',
      status: 'minting_placeholder',
      transactionHash: '0x' + Math.random().toString(16).substring(2, 66)
    });
  } catch (error) {
    return res.status(500).send({ 
      ok: false, 
      error: error.message 
    });
  }
};

// Get generative series by artist
exports.getGenerativeSeriesByArtist = async (req, res) => {
  try {
    const artistId = req.params.artistId;
    
    const series = await GenerativeSerie.find({ artists: artistId })
      .populate('artists', 'username email')
      .populate('chain', 'name symbol')
      .populate('sketchId', 'name css javascript')
      .sort({ date: -1 });

    return res.status(200).send({ 
      ok: true, 
      series 
    });
  } catch (error) {
    return res.status(500).send({ 
      ok: false, 
      error: error.message 
    });
  }
};

// Get generative series by algorithm type
exports.getGenerativeSeriesByAlgorithm = async (req, res) => {
  try {
    const algorithm = req.params.algorithm;
    
    const series = await GenerativeSerie.find({ algorithm: algorithm })
      .populate('artists', 'username email')
      .populate('chain', 'name symbol')
      .populate('sketchId', 'name css javascript')
      .sort({ date: -1 });

    return res.status(200).send({ 
      ok: true, 
      series 
    });
  } catch (error) {
    return res.status(500).send({ 
      ok: false, 
      error: error.message 
    });
  }
};

// Search generative series
exports.searchGenerativeSeries = async (req, res) => {
  try {
    const query = req.query.q || '';
    
    const series = await GenerativeSerie.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { algorithm: { $regex: query, $options: 'i' } },
        { style: { $regex: query, $options: 'i' } }
      ]
    })
    .populate('artists', 'username email')
    .populate('chain', 'name symbol')
    .populate('sketchId', 'name css javascript')
    .sort({ date: -1 })
    .limit(50);

    return res.status(200).send({ 
      ok: true, 
      series 
    });
  } catch (error) {
    return res.status(500).send({ 
      ok: false, 
      error: error.message 
    });
  }
};