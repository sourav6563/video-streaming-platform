import { Schema, model, Types, Model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

interface Comment {
  video: Types.ObjectId;
  owner: Types.ObjectId;
  communityPost: Types.ObjectId;
  content: string;
}

const commentSchema = new Schema<Comment>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true,
      index: true,
    },
    communityPost: {
      type: Schema.Types.ObjectId,
      ref: "CommunityPost",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

commentSchema.plugin(mongooseAggregatePaginate);
interface CommentModel extends Model<Comment> {
  aggregatePaginate: any;
}

export const Comment = model<Comment, CommentModel>("Comment", commentSchema);
