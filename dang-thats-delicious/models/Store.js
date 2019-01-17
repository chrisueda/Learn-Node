const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!',
  },
  slug: String,
  description: {
    type: String,
    trim: true,
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: {
      type: String,
      default: 'Point',
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!',
    }],
    address: {
      type: String,
      required: 'You must supply an address!',
    },
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author',
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Define our indexes
storeSchema.index({
  name: 'text',
  description: 'text',
});

storeSchema.index({
  location: '2dsphere',
});

// Create slug
storeSchema.pre('save', async function preSlug(next) {
  if (!this.isModified('name')) {
    next(); // skip it
    return; // stop this func from running
  }
  this.slug = slug(this.name);
  // find other stores that have the same slug
  const slugRegex = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegex });
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }

  next();
});

// Add new static method. Need to be reg function to use 'this'
storeSchema.statics.getTagsList = function tagsList() {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};

storeSchema.statics.getTopStores = function topStores() {
  // aggregate is mongodb function.
  return this.aggregate([
  // Lookup stores and populate their reviews
    {
      $lookup: {
        from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews',
      },
    },
    // filter for only items that have 2 or more reviews
    {
      $match: {
        'reviews.1': {
          $exists: true,
        },
      },
    },
    // add the average reviews field
    {
      $addFields: {
        averageRating: {
          $avg: '$reviews.rating',
        },
      },
    },
    // sort it by our new field, highest reviews first
    {
      $sort: {
        averageRating: -1,
      },
    },
    // limit to at most 10
    {
      $limit: 10,
    },
  ]);
};

// find reviews where the stores _id property === reviews store property.
storeSchema.virtual('reviews', {
  ref: 'Review', // which model to link?
  localField: '_id', // which field on store
  foreignField: 'store', // which field on review
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
