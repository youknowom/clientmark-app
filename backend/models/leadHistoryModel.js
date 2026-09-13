import mongoose from "mongoose";

const LeadHistorySchema = new mongoose.Schema({
    tenantId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'tenants',
        required:true,
        index: true,
    },

    leadId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'leads',
        index: true,
    },

    assignToId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'users',
        default:null,
        index: true,
    },

    assignById:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'users',
        default:null,
        index: true,
    }
},{timestamps:true});

const LeadHistoryModel = mongoose.model('lead_histories',LeadHistorySchema);

export default LeadHistoryModel;